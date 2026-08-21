/**
 * End-to-end check of the payment lifecycle: the daily sweep, the self-declare
 * flow, rejection rollback, and administrator overrides.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";
import { declarePayment, getSettings, reviewPayment, runBillingSweep, setOverride, viewFor } from "../src/lib/billing";

const prisma = new PrismaClient();
let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✘"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}

const settings = await getSettings();
const days = (n: number) => new Date(Date.now() - n * 86_400_000);

async function learnerByEmail(email: string) {
  return prisma.learner.findFirstOrThrow({ where: { user: { email } } });
}

const subject = await learnerByEmail("kevin.aguilar@arkusnexus.com");
const superAdmin = await prisma.user.findFirstOrThrow({ where: { role: "SUPER_ADMIN" } });

// ── Sweep: paid up -> nothing changes ──────────────────────────────────────
await prisma.learner.update({
  where: { id: subject.id },
  data: { billingStatus: "ACTIVE", paidThrough: new Date(Date.now() + 5 * 86_400_000) },
});
await runBillingSweep();
check("paid-up learner stays ACTIVE",
  (await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } })).billingStatus, "ACTIVE");

// ── Sweep: just lapsed -> PAST_DUE, still has access ──────────────────────
await prisma.learner.update({
  where: { id: subject.id },
  data: { billingStatus: "ACTIVE", paidThrough: days(2) },
});
await runBillingSweep();
let row = await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } });
check("lapsed learner becomes PAST_DUE", row.billingStatus, "PAST_DUE");
check("PAST_DUE keeps access during grace", viewFor(row, settings).access, true);

// ── Sweep: past grace -> SUSPENDED, access revoked ────────────────────────
await prisma.learner.update({
  where: { id: subject.id },
  data: { paidThrough: days(settings.graceDays + 3) },
});
await runBillingSweep();
row = await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } });
check("past grace becomes SUSPENDED", row.billingStatus, "SUSPENDED");
check("SUSPENDED loses access", viewFor(row, settings).access, false);

// ── The sweep is idempotent ───────────────────────────────────────────────
const second = await runBillingSweep();
check("re-running the sweep changes nothing", second.suspended + second.pastDue, 0);

// ── Declaring a payment restores access immediately ───────────────────────
const payment = await declarePayment(subject.id, "BRE-TEST-1");
row = await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } });
check("declaration reactivates", row.billingStatus, "ACTIVE");
check("declaration grants access", viewFor(row, settings).access, true);
check("declaration lands in the review queue", payment.reviewState, "PENDING");
check("period advances one month",
  Math.round((payment.periodEnd.getTime() - payment.periodStart.getTime()) / 86_400_000) >= 28, true);

// ── Confirming is a no-op on access ───────────────────────────────────────
await reviewPayment(payment.id, "CONFIRMED", superAdmin.id, "verificado en el banco");
row = await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } });
check("confirmation leaves access intact", row.billingStatus, "ACTIVE");

// ── Rejection rolls the period back ───────────────────────────────────────
const lapsedAt = days(settings.graceDays + 3);
await prisma.learner.update({
  where: { id: subject.id },
  data: { billingStatus: "SUSPENDED", paidThrough: lapsedAt },
});
const rejected = await declarePayment(subject.id, "BRE-TEST-2");
check("second declaration reactivates",
  (await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } })).billingStatus, "ACTIVE");
await reviewPayment(rejected.id, "REJECTED", superAdmin.id, "no se encontró el pago");
row = await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } });
check("rejection revokes access again", viewFor(row, settings).access, false);
check("rejection restores the exact previous expiry",
  row.paidThrough?.getTime(), lapsedAt.getTime());
check("rejection returns a suspended learner to SUSPENDED", row.billingStatus, "SUSPENDED");

// ── Override is immune to the sweep ───────────────────────────────────────
await setOverride(subject.id, "OVERRIDE_ACTIVE", superAdmin.id, "beca interna");
await runBillingSweep();
row = await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } });
check("override survives the sweep", row.billingStatus, "OVERRIDE_ACTIVE");
check("override grants access despite a lapsed period", viewFor(row, settings).access, true);
check("override records who and why",
  [row.statusOverrideBy === superAdmin.id, row.statusOverrideNote], [true, "beca interna"]);

// ── A DISABLED learner cannot buy their way back in ───────────────────────
await setOverride(subject.id, "DISABLED", superAdmin.id, "baja administrativa");
await declarePayment(subject.id, "BRE-TEST-3");
row = await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } });
check("declaration cannot lift a DISABLED hold", row.billingStatus, "DISABLED");

// ── Clearing the override returns to automatic handling ───────────────────
await setOverride(subject.id, null, superAdmin.id, "reactivado");
await runBillingSweep();
row = await prisma.learner.findUniqueOrThrow({ where: { id: subject.id } });
check("cleared override falls back to the computed status",
  ["PAST_DUE", "SUSPENDED", "ACTIVE"].includes(row.billingStatus), true);

// ── Audit trail ──────────────────────────────────────────────────────────
const audits = await prisma.billingAudit.count({ where: { learnerId: subject.id } });
check("every transition is audited", audits > 5, true);

// Restore the seeded state.
await prisma.payment.deleteMany({ where: { learnerId: subject.id } });
await prisma.billingAudit.deleteMany({ where: { learnerId: subject.id } });
await prisma.learner.update({
  where: { id: subject.id },
  data: {
    billingStatus: "ACTIVE",
    paidThrough: new Date(Date.now() + 30 * 86_400_000),
    statusOverrideBy: null,
    statusOverrideNote: null,
    statusOverrideAt: null,
  },
});

console.log(failures === 0 ? "\nall billing checks passed" : `\n${failures} check(s) failed`);
await prisma.$disconnect();
process.exit(failures === 0 ? 0 : 1);
