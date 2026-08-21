/**
 * Additive seed for the real deployment.
 *
 * Unlike `prisma/seed.ts` — which clears the demo tables first — this script
 * DESTROYS NOTHING and is safe to run against a live database. Everything it
 * does is an upsert or a "create only if absent", so running it twice changes
 * nothing the second time.
 *
 *   npm run seed:owner
 *
 * It ensures:
 *   - the six badge rows
 *   - the single Global Template (built only if no template exists yet)
 *   - the Super Admin account, with the password below
 *   - the "Leo's Friends" organization, with the template replicated into it
 *     as an independent copy and its areas made visible to learners
 *   - a test learner in that organization, with a full month of access
 *
 * Credentials come from the environment when set, so a password need not sit in
 * the repository:
 *   OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME, OWNER_ORG
 *   LEARNER_EMAIL, LEARNER_PASSWORD, LEARNER_NAME
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";
import { ensureBadges, ensureTemplate } from "../prisma/seed-template";
import { replicate } from "../prisma/seed-replicate";

const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "olanoleon@gmail.com")
  .trim()
  .toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "admin123";
const OWNER_NAME = process.env.OWNER_NAME ?? "Leon Gil";
const ORG_NAME = process.env.OWNER_ORG ?? "Leo's Friends";

const LEARNER_EMAIL = (process.env.LEARNER_EMAIL ?? "learner@gmail.com")
  .trim()
  .toLowerCase();
const LEARNER_PASSWORD = process.env.LEARNER_PASSWORD ?? "learner123";
const LEARNER_NAME = process.env.LEARNER_NAME ?? "Learner Test";

const prisma = new PrismaClient();

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function main() {
  console.log(`database: ${(process.env.DATABASE_URL ?? "").replace(/:\/\/([^:]+):[^@]+@/, "://$1:****@")}\n`);

  // ── Badges and template ───────────────────────────────────────────────────
  const badges = await ensureBadges(prisma);
  console.log(`✔ badges: ${badges.length}`);

  const template = await ensureTemplate(prisma);
  const templateAreas = await prisma.area.count({
    where: { scope: "GLOBAL", templateId: template.id },
  });
  console.log(
    template.created
      ? `✔ global template built (${templateAreas} areas)`
      : `✔ global template already present (${templateAreas} areas)`,
  );

  // ── Super Admin ───────────────────────────────────────────────────────────
  // Upsert so re-running resets the password rather than failing on the unique
  // email. mustChangePassword is false: this password was chosen deliberately,
  // not generated from the email address.
  const passwordHash = await bcrypt.hash(OWNER_PASSWORD, 12);
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {
      passwordHash,
      name: OWNER_NAME,
      role: "SUPER_ADMIN",
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: OWNER_EMAIL,
      passwordHash,
      name: OWNER_NAME,
      role: "SUPER_ADMIN",
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`✔ super admin: ${owner.email}`);

  // ── Organization ──────────────────────────────────────────────────────────
  const slug = slugify(ORG_NAME);
  const existingOrg = await prisma.organization.findFirst({
    where: { OR: [{ name: ORG_NAME }, { slug }] },
  });

  const org =
    existingOrg ??
    (await prisma.organization.create({ data: { name: ORG_NAME, slug } }));

  if (existingOrg) {
    console.log(`• "${ORG_NAME}" already exists — leaving its content alone`);
  } else {
    const counts = await replicate(prisma, template.id, org.id);
    // Replication deliberately arrives hidden so an administrator decides when
    // learners see it. This is the owner's own organization, so reveal it.
    await prisma.area.updateMany({
      where: { orgId: org.id },
      data: { isVisible: true },
    });
    console.log(
      `✔ "${ORG_NAME}" created from the template and made visible`,
    );
    console.log(
      `  ${counts.areas} areas · ${counts.units} units · ${counts.words} words · ${counts.activities} activities`,
    );
  }

  // ── Test learner ──────────────────────────────────────────────────────────
  // A learner needs both a User row (to sign in) and a Learner row (which is
  // what carries org membership, XP and billing). paidThrough a month out so
  // the account has access and no payment banner.
  const learnerHash = await bcrypt.hash(LEARNER_PASSWORD, 12);
  const paidThrough = new Date();
  paidThrough.setUTCMonth(paidThrough.getUTCMonth() + 1);

  const learnerUser = await prisma.user.upsert({
    where: { email: LEARNER_EMAIL },
    update: {
      passwordHash: learnerHash,
      name: LEARNER_NAME,
      role: "LEARNER",
      orgId: org.id,
      isActive: true,
      mustChangePassword: false,
    },
    create: {
      email: LEARNER_EMAIL,
      passwordHash: learnerHash,
      name: LEARNER_NAME,
      role: "LEARNER",
      orgId: org.id,
      isActive: true,
      mustChangePassword: false,
    },
    include: { learner: true },
  });

  if (learnerUser.learner) {
    await prisma.learner.update({
      where: { id: learnerUser.learner.id },
      data: { orgId: org.id, billingStatus: "TRIAL", paidThrough },
    });
  } else {
    await prisma.learner.create({
      data: {
        userId: learnerUser.id,
        orgId: org.id,
        team: "Amigos",
        billingStatus: "TRIAL",
        paidThrough,
      },
    });
  }
  console.log(`✔ test learner: ${learnerUser.email} (in "${ORG_NAME}")`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const [orgs, users, learners, areas, units] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.learner.count(),
    prisma.area.count({ where: { orgId: org.id, isVisible: true } }),
    prisma.unit.count({ where: { area: { orgId: org.id } } }),
  ]);

  console.log(
    `\ndatabase now holds ${orgs} organization(s), ${users} user(s), ${learners} learner(s).`,
  );
  console.log(
    `"${ORG_NAME}": ${areas} visible area(s), ${units} unit(s).`,
  );
  console.log(`\nSign in at /login:`);
  console.log(`  super admin  ${OWNER_EMAIL}`);
  console.log(`  learner      ${LEARNER_EMAIL}`);
  console.log(
    "\nAdd more learners from /super (choose this organization), or from /admin as one of its admins.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
