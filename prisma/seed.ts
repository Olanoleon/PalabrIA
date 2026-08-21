/**
 * Database seed.
 *
 * Creates the single Global Template the PRD asks for (two areas: three Very
 * Easy units and two Hard units), two organizations that receive independent
 * replicas of it, and the cast from the design's leaderboard so the board,
 * level bar and streak strip render real data on first load.
 *
 * Idempotent: re-running it resets the demo data rather than duplicating it.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";
import { SEED_AREAS, SEED_BADGES, TEMPLATE_NAME } from "./seed-content";
import type { XpReason } from "../src/generated/prisma";

const prisma = new PrismaClient();

const now = new Date();
const HASH_ROUNDS = 10; // seed only; the app uses 12

async function hash(plain: string) {
  return bcrypt.hash(plain, HASH_ROUNDS);
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function daysAgo(n: number) {
  return new Date(now.getTime() - n * 86_400_000);
}

/** YYYY-MM-DD in Bogota, matching how the app counts streak days. */
function bogotaDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function main() {
  console.log("→ clearing demo data");
  // Order matters only where cascades do not cover it; the truncate-style
  // deletes below are cheap on a seed-sized database.
  await prisma.$transaction([
    prisma.activityAttempt.deleteMany(),
    prisma.xpLedger.deleteMany(),
    prisma.learnerBadge.deleteMany(),
    prisma.unitProgress.deleteMany(),
    prisma.billingAudit.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.authToken.deleteMany(),
    prisma.learner.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.word.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.area.deleteMany(),
    prisma.globalTemplate.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.badge.deleteMany(),
  ]);

  // ── Platform settings ─────────────────────────────────────────────────────
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      brebKey: "@palabria",
      monthlyAmount: 25000,
      currency: "COP",
      graceDays: 5,
    },
  });

  // ── Badges ────────────────────────────────────────────────────────────────
  await prisma.badge.createMany({ data: SEED_BADGES });
  const badges = await prisma.badge.findMany();
  const badgeId = (key: string) => badges.find((b) => b.key === key)!.id;

  // ── Global template ───────────────────────────────────────────────────────
  console.log("→ building the global template");
  const template = await prisma.globalTemplate.create({
    data: { name: TEMPLATE_NAME },
  });

  for (const [areaIndex, area] of SEED_AREAS.entries()) {
    const createdArea = await prisma.area.create({
      data: {
        scope: "GLOBAL",
        templateId: template.id,
        name: area.name,
        nameEs: area.nameEs,
        description: area.description,
        iconKey: area.iconKey,
        tint: area.tint,
        sortOrder: areaIndex,
        isVisible: true,
      },
    });

    for (const [unitIndex, unit] of area.units.entries()) {
      const createdUnit = await prisma.unit.create({
        data: {
          areaId: createdArea.id,
          name: unit.name,
          subtitle: unit.subtitle,
          subtitleEn: unit.subtitleEn,
          sortOrder: unitIndex,
          isVisible: true,
          difficulty: unit.difficulty,
          wordCount: unit.words.length,
          introParagraph: unit.introParagraph,
          introParagraphEs: unit.introParagraphEs,
        },
      });

      const wordIds = new Map<string, string>();
      for (const [wordIndex, word] of unit.words.entries()) {
        const created = await prisma.word.create({
          data: { ...word, unitId: createdUnit.id, sortOrder: wordIndex },
        });
        wordIds.set(word.text.toLowerCase(), created.id);
      }

      for (const [activityIndex, activity] of unit.activities.entries()) {
        const wordId = wordIds.get(activity.word.toLowerCase());
        if (!wordId) {
          throw new Error(
            `Activity in "${unit.name}" references unknown word "${activity.word}"`,
          );
        }
        await prisma.activity.create({
          data: {
            unitId: createdUnit.id,
            wordId,
            type: activity.type,
            prompt: activity.prompt,
            promptEs: activity.promptEs,
            sentence: activity.sentence ?? null,
            options: activity.options ?? [],
            answerIndex: activity.answerIndex ?? 0,
            note: activity.note,
            noteEs: activity.noteEs,
            mono: activity.mono ?? false,
            sortOrder: activityIndex,
          },
        });
      }
    }
  }

  // ── Organizations ─────────────────────────────────────────────────────────
  console.log("→ creating organizations and replicating the template");
  const { replicate } = await import("./seed-replicate");

  const arkus = await prisma.organization.create({
    data: { name: "Arkus", slug: "arkus" },
  });
  const camil = await prisma.organization.create({
    data: { name: "CAMIL Institute Medellín", slug: "camil-medellin" },
  });

  for (const org of [arkus, camil]) {
    await replicate(prisma, template.id, org.id);
  }

  // An administrator would have revealed these; do it here so the demo learner
  // has something to open. CAMIL's stay hidden, which is the default.
  await prisma.area.updateMany({
    where: { orgId: arkus.id },
    data: { isVisible: true },
  });

  // ── Users ─────────────────────────────────────────────────────────────────
  console.log("→ creating users");
  const superAdmin = await prisma.user.create({
    data: {
      email: "super@palabria.app",
      passwordHash: await hash("super@palabria.app"),
      name: "Leon Gil",
      role: "SUPER_ADMIN",
      mustChangePassword: false,
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@arkusnexus.com",
      passwordHash: await hash("admin@arkusnexus.com"),
      name: "Jorge Salgado",
      role: "ORG_ADMIN",
      orgId: arkus.id,
      mustChangePassword: false,
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@camil.edu.co",
      passwordHash: await hash("admin@camil.edu.co"),
      name: "Camila Restrepo",
      role: "ORG_ADMIN",
      orgId: camil.id,
      mustChangePassword: false,
    },
  });

  // The design's leaderboard cast. XP here becomes both the lifetime total and
  // this month's ledger, so the board matches the profile numbers.
  const cast = [
    { name: "Mariana Duarte", email: "mariana.duarte@arkusnexus.com", team: "Diseño", xp: 2480, streak: 21 },
    { name: "Kevin Aguilar", email: "kevin.aguilar@arkusnexus.com", team: "QA", xp: 2105, streak: 9 },
    { name: "Sofía Beltrán", email: "sofia.beltran@arkusnexus.com", team: "Data", xp: 1690, streak: 4 },
    { name: "Ana Rueda", email: "ana.rueda@arkusnexus.com", team: "Producto", xp: 840, streak: 12 },
    { name: "Luis Ontiveros", email: "luis.ontiveros@arkusnexus.com", team: "Ingeniería", xp: 780, streak: 2 },
    { name: "Paula Escamilla", email: "paula.escamilla@arkusnexus.com", team: "Soporte", xp: 655, streak: 0 },
    { name: "Diego Márquez", email: "diego.marquez@arkusnexus.com", team: "Ingeniería", xp: 520, streak: 1 },
  ];

  const learnerIdByEmail = new Map<string, string>();

  for (const person of cast) {
    const user = await prisma.user.create({
      data: {
        email: person.email,
        passwordHash: await hash(person.email),
        name: person.name,
        role: "LEARNER",
        orgId: arkus.id,
        // The demo learner skips the forced change so the app opens on /path.
        mustChangePassword: person.email !== "ana.rueda@arkusnexus.com",
        learner: {
          create: {
            orgId: arkus.id,
            team: person.team,
            xp: person.xp,
            streakCount: person.streak,
            streakLastDay: person.streak > 0 ? bogotaDay(now) : null,
            lastActiveAt: person.streak > 0 ? now : daysAgo(9),
            billingStatus: "ACTIVE",
            paidThrough: addMonths(now, 1),
          },
        },
      },
      include: { learner: true },
    });
    learnerIdByEmail.set(person.email, user.learner!.id);

    // This month's ledger, so the leaderboard has something to sum.
    await prisma.xpLedger.create({
      data: {
        learnerId: user.learner!.id,
        delta: person.xp,
        reason: "UNIT_PASS" as XpReason,
        createdAt: daysAgo(2),
      },
    });
  }

  // ── Demo progress for Ana ─────────────────────────────────────────────────
  console.log("→ giving Ana some history");
  const anaId = learnerIdByEmail.get("ana.rueda@arkusnexus.com")!;
  const humanBody = await prisma.area.findFirstOrThrow({
    where: { orgId: arkus.id, name: "Human Body" },
    include: { units: { orderBy: { sortOrder: "asc" } } },
  });

  // Unit 1 passed outright, unit 2 passed at 83% — the design's own pattern —
  // which leaves unit 3 as the current one.
  const history: Array<{ unitIndex: number; score: number; attempts: number }> = [
    { unitIndex: 0, score: 100, attempts: 1 },
    { unitIndex: 1, score: 83, attempts: 2 },
  ];
  for (const row of history) {
    const unit = humanBody.units[row.unitIndex];
    if (!unit) continue;
    await prisma.unitProgress.create({
      data: {
        learnerId: anaId,
        unitId: unit.id,
        bestScore: row.score,
        attempts: row.attempts,
        xpAwarded: row.score >= 70 ? 30 : 0,
        flawless: row.score === 100,
        passedAt: daysAgo(3),
      },
    });
  }

  await prisma.learnerBadge.createMany({
    data: [
      { learnerId: anaId, badgeId: badgeId("bd1"), earnedAt: daysAgo(3) },
      { learnerId: anaId, badgeId: badgeId("bd2"), earnedAt: daysAgo(1) },
      { learnerId: anaId, badgeId: badgeId("bd6"), earnedAt: daysAgo(3) },
    ],
  });

  // ── Billing edge cases, so the payments screen has something to show ──────
  const pastDue = learnerIdByEmail.get("paula.escamilla@arkusnexus.com")!;
  await prisma.learner.update({
    where: { id: pastDue },
    data: { billingStatus: "PAST_DUE", paidThrough: daysAgo(2) },
  });

  const suspended = learnerIdByEmail.get("diego.marquez@arkusnexus.com")!;
  await prisma.learner.update({
    where: { id: suspended },
    data: { billingStatus: "SUSPENDED", paidThrough: daysAgo(12) },
  });

  const override = learnerIdByEmail.get("luis.ontiveros@arkusnexus.com")!;
  await prisma.learner.update({
    where: { id: override },
    data: {
      billingStatus: "OVERRIDE_ACTIVE",
      paidThrough: daysAgo(30),
      statusOverrideBy: superAdmin.id,
      statusOverrideNote: "Beca interna — acceso autorizado sin pago.",
      statusOverrideAt: daysAgo(5),
    },
  });

  // A pending declaration for the Super Admin queue.
  await prisma.payment.create({
    data: {
      learnerId: learnerIdByEmail.get("sofia.beltran@arkusnexus.com")!,
      amount: 25000,
      currency: "COP",
      reference: "BRE-4471",
      declaredAt: daysAgo(1),
      periodStart: daysAgo(1),
      periodEnd: addMonths(daysAgo(1), 1),
    },
  });

  console.log("\n✔ seed complete");
  console.log("  super admin  super@palabria.app       / super@palabria.app");
  console.log("  org admin    admin@arkusnexus.com     / admin@arkusnexus.com");
  console.log("  learner      ana.rueda@arkusnexus.com / ana.rueda@arkusnexus.com");
  console.log("  suspended    diego.marquez@arkusnexus.com (password = email)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
