/**
 * The PRD's mandatory rules, checked against the real database:
 *
 *   - An Org Admin sees only their own organization, never the Global Template.
 *   - A replicated organization copy is independent: editing it leaves the
 *     template and every other organization byte-identical.
 *   - Template edits do not reach organizations that already exist.
 *   - Organization Mode scopes the Super Admin to one organization.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { PrismaClient } from "../src/generated/prisma";
import { areaScopeFor, type Actor } from "../src/lib/scope";
import { replicateTemplateToOrg } from "../src/lib/replicate";

const prisma = new PrismaClient();
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✘"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

/**
 * A short digest of a unit's teachable content. Hashed rather than printed in
 * full so a failure is readable instead of a wall of JSON.
 */
async function fingerprint(unitId: string) {
  const unit = await prisma.unit.findUniqueOrThrow({
    where: { id: unitId },
    include: {
      words: { orderBy: { sortOrder: "asc" } },
      activities: { orderBy: { sortOrder: "asc" } },
    },
  });
  const payload = JSON.stringify({
    name: unit.name,
    intro: unit.introParagraph,
    words: unit.words.map((w) => [w.text, w.ipa, w.definitionEs, w.exampleSentence]),
    activities: unit.activities.map((a) => [a.type, a.prompt, a.options, a.answerIndex]),
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 12);
}

/** The stored intro paragraph, needed to restore it after the edit tests. */
async function introOf(unitId: string) {
  return (await prisma.unit.findUniqueOrThrow({ where: { id: unitId } }))
    .introParagraph;
}

const template = await prisma.globalTemplate.findFirstOrThrow();
const arkus = await prisma.organization.findFirstOrThrow({ where: { slug: "arkus" } });
const camil = await prisma.organization.findFirstOrThrow({
  where: { slug: "camil-medellin" },
});

const orgAdmin: Actor = await prisma.user.findFirstOrThrow({
  where: { email: "admin@arkusnexus.com" },
  select: { id: true, role: true, orgId: true },
});

const superAdmin: Actor = await prisma.user.findFirstOrThrow({
  where: { role: "SUPER_ADMIN" },
  select: { id: true, role: true, orgId: true },
});

// ── An Org Admin's scope is exactly their organization ─────────────────────
const orgFilter = areaScopeFor(orgAdmin, null);
check("org admin is scoped to ORG areas", orgFilter.scope, "ORG");
check("org admin is scoped to their own org", "orgId" in orgFilter && orgFilter.orgId, arkus.id);

const visibleToOrgAdmin = await prisma.area.findMany({
  where: { ...orgFilter, isVisible: undefined },
  select: { orgId: true, scope: true },
});
check("org admin sees only their own areas",
  [...new Set(visibleToOrgAdmin.map((a) => a.orgId))], [arkus.id]);
check("org admin sees no global areas",
  visibleToOrgAdmin.filter((a) => a.scope === "GLOBAL").length, 0);

// ── Organization Mode is what scopes the Super Admin ─────────────────────
check("super admin outside Organization Mode reads the template",
  areaScopeFor(superAdmin, null).scope, "GLOBAL");
const inOrgMode = areaScopeFor(superAdmin, camil.id);
check("super admin in Organization Mode is scoped to that organization",
  [inOrgMode.scope, "orgId" in inOrgMode && inOrgMode.orgId], ["ORG", camil.id]);
const orgModeAreas = await prisma.area.findMany({
  where: { ...inOrgMode, isVisible: undefined },
  select: { orgId: true, scope: true },
});
check("Organization Mode cannot reach global areas",
  orgModeAreas.filter((a) => a.scope === "GLOBAL").length, 0);
check("Organization Mode cannot reach another organization",
  [...new Set(orgModeAreas.map((a) => a.orgId))], [camil.id]);

// An Org Admin must also be refused write access to a foreign organization.
const { assertOrgWriteFor, Forbidden } = await import("../src/lib/scope");
let refused = false;
try {
  assertOrgWriteFor(orgAdmin, camil.id);
} catch (error) {
  refused = error instanceof Forbidden;
}
check("org admin cannot write to another organization", refused, true);

// ── Editing an organization copy does not touch the template or siblings ──
const arkusUnit = await prisma.unit.findFirstOrThrow({
  where: { area: { orgId: arkus.id, name: "Human Body" } },
  orderBy: { sortOrder: "asc" },
});
const templateUnitId = arkusUnit.sourceUnitId!;
const camilUnit = await prisma.unit.findFirstOrThrow({
  where: { area: { orgId: camil.id }, sourceUnitId: templateUnitId },
});

check("the copy records its template origin", typeof templateUnitId, "string");

const templateBefore = await fingerprint(templateUnitId);
const camilBefore = await fingerprint(camilUnit.id);
const originalIntro = await introOf(templateUnitId);

await prisma.$transaction([
  prisma.unit.update({
    where: { id: arkusUnit.id },
    data: { introParagraph: "ARKUS-ONLY EDIT", name: "The head (Arkus)" },
  }),
  prisma.word.create({
    data: {
      unitId: arkusUnit.id,
      text: "temple",
      translation: "la sien",
      definition: "The flat area at the side of the forehead.",
      definitionEs: "La sien: la zona plana al lado de la frente.",
      ipa: "/ˈtɛm.pəl/",
      syllables: "TEM·ple",
      stress: "tem",
      pos: "sustantivo",
      exampleSentence: "He rubbed his temple.",
      exampleSentenceEs: "Se frotó la sien.",
      sortOrder: 99,
    },
  }),
]);

check("template is unchanged by an org edit",
  await fingerprint(templateUnitId), templateBefore);
check("the other organization is unchanged by an org edit",
  await fingerprint(camilUnit.id), camilBefore);

const arkusWords = await prisma.word.count({ where: { unitId: arkusUnit.id } });
const templateWords = await prisma.word.count({ where: { unitId: templateUnitId } });
check("only the edited organization gained the new word",
  [arkusWords, templateWords], [7, 6]);

// ── Template edits do not reach existing organizations ────────────────────
const arkusAfterFingerprint = await fingerprint(arkusUnit.id);
await prisma.unit.update({
  where: { id: templateUnitId },
  data: { introParagraph: "TEMPLATE-ONLY EDIT" },
});
check("an existing organization is unchanged by a template edit",
  await fingerprint(arkusUnit.id), arkusAfterFingerprint);
check("camil is unchanged by a template edit",
  await fingerprint(camilUnit.id), camilBefore);

// ── A new organization gets the template as it stands now, hidden ─────────
const fresh = await prisma.organization.create({
  data: { name: "Isolation Test Org", slug: `iso-${Date.now()}` },
});
const counts = await replicateTemplateToOrg(template.id, fresh.id);
check("replication copies the whole tree",
  counts.areas > 0 && counts.units > 0 && counts.words > 0 && counts.activities > 0, true);

const freshAreas = await prisma.area.findMany({ where: { orgId: fresh.id } });
check("replicated areas arrive hidden",
  freshAreas.every((a) => !a.isVisible), true);

const freshUnit = await prisma.unit.findFirstOrThrow({
  where: { areaId: { in: freshAreas.map((a) => a.id) }, sourceUnitId: templateUnitId },
});
check("a new organization receives the current template text",
  (await prisma.unit.findUniqueOrThrow({ where: { id: freshUnit.id } })).introParagraph,
  "TEMPLATE-ONLY EDIT");

// A replicated activity must point at the copy's own word, never the template's.
const freshActivity = await prisma.activity.findFirstOrThrow({
  where: { unitId: freshUnit.id },
  include: { word: { select: { unitId: true } } },
});
check("replicated activities point at the copy's own words",
  freshActivity.word.unitId, freshUnit.id);

// ── Clean up: undo the edits and drop the throwaway organization ──────────
await prisma.organization.delete({ where: { id: fresh.id } });
await prisma.word.deleteMany({ where: { unitId: arkusUnit.id, text: "temple" } });
await prisma.unit.update({
  where: { id: arkusUnit.id },
  data: { name: "The head", introParagraph: originalIntro },
});
await prisma.unit.update({
  where: { id: templateUnitId },
  data: { introParagraph: originalIntro },
});

check("cleanup restored the organization copy",
  await fingerprint(arkusUnit.id), templateBefore);

console.log(failures === 0 ? "\nall isolation checks passed" : `\n${failures} check(s) failed`);
await prisma.$disconnect();
process.exit(failures === 0 ? 0 : 1);
