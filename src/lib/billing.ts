/**
 * Billing operations against the database. The rules themselves live in
 * `billing-rules.ts`; this module only reads, writes and audits.
 *
 * v1 collects out-of-band via a Bre-B QR, so there is no provider webhook: the
 * learner self-declares and access extends immediately, and a Super Admin queue
 * provides after-the-fact control. Swapping in a real PSP later should touch
 * only this module and `breb.ts`.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import {
  addCycle,
  billingView,
  evaluateStatus,
  isAdminHeld,
  nextPeriod,
  type BillingView,
} from "@/lib/billing-rules";
import type { BillingStatus } from "@/generated/prisma";

export type Settings = {
  brebKey: string;
  monthlyAmount: number;
  currency: string;
  graceDays: number;
  openaiModel: string;
};

export async function getSettings(): Promise<Settings> {
  const row = await prisma.platformSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return {
    brebKey: row.brebKey,
    monthlyAmount: row.monthlyAmount,
    currency: row.currency,
    graceDays: row.graceDays,
    openaiModel: row.openaiModel,
  };
}

export async function updateSettings(patch: Partial<Settings>) {
  return prisma.platformSettings.upsert({
    where: { id: 1 },
    update: patch,
    create: { id: 1, ...patch },
  });
}

type LearnerBilling = {
  id: string;
  billingStatus: BillingStatus;
  paidThrough: Date | null;
};

/**
 * The learner's billing state as of now. Re-evaluated on read so a learner
 * whose period lapsed since the last sweep is not still holding access.
 */
export function viewFor(
  learner: LearnerBilling,
  settings: Pick<Settings, "graceDays">,
  now = new Date(),
): BillingView {
  return billingView({
    status: learner.billingStatus,
    paidThrough: learner.paidThrough,
    graceDays: settings.graceDays,
    now,
  });
}

async function transition(
  learnerId: string,
  from: BillingStatus,
  to: BillingStatus,
  reason: string,
  actorId?: string,
) {
  if (from === to) return;
  await prisma.$transaction([
    prisma.learner.update({
      where: { id: learnerId },
      data: { billingStatus: to },
    }),
    prisma.billingAudit.create({
      data: { learnerId, from, to, reason, actorId },
    }),
  ]);
}

/** Learner taps "I paid": record the declaration and extend access at once. */
export async function declarePayment(
  learnerId: string,
  reference: string | null,
  now = new Date(),
) {
  const settings = await getSettings();
  const learner = await prisma.learner.findUniqueOrThrow({
    where: { id: learnerId },
  });
  const { periodStart, periodEnd } = nextPeriod(learner.paidThrough, now);

  const payment = await prisma.payment.create({
    data: {
      learnerId,
      amount: settings.monthlyAmount,
      currency: settings.currency,
      reference: reference?.trim() || null,
      periodStart,
      periodEnd,
      previousPaidThrough: learner.paidThrough,
    },
  });

  // An administrator hold outranks a self-declaration in both directions: a
  // DISABLED learner does not buy their way back in, and OVERRIDE_ACTIVE stays.
  if (!isAdminHeld(learner.billingStatus)) {
    await prisma.learner.update({
      where: { id: learnerId },
      data: { paidThrough: periodEnd, billingStatus: "ACTIVE" },
    });
    await prisma.billingAudit.create({
      data: {
        learnerId,
        from: learner.billingStatus,
        to: "ACTIVE",
        reason: `payment declared (${payment.id})`,
      },
    });
  }
  return payment;
}

/**
 * Super Admin review. Confirming is a no-op on access; rejecting rolls the
 * period back to where it stood before the declaration.
 */
export async function reviewPayment(
  paymentId: string,
  decision: "CONFIRMED" | "REJECTED",
  actorId: string,
  note?: string,
) {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    include: { learner: true },
  });
  if (payment.reviewState !== "PENDING") return payment;

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      reviewState: decision,
      reviewedBy: actorId,
      reviewedAt: new Date(),
      note: note?.trim() || null,
    },
  });

  if (decision === "REJECTED") {
    const settings = await getSettings();
    const learner = payment.learner;
    // Only roll back if this declaration is the one that granted the current
    // period — a later declaration must not be undone by rejecting an older
    // one. Restore the exact expiry the declaration replaced, not its start:
    // a learner who was already past grace must return to being past grace.
    const grantedCurrentPeriod =
      learner.paidThrough?.getTime() === payment.periodEnd.getTime();
    const rollback = grantedCurrentPeriod
      ? payment.previousPaidThrough
      : learner.paidThrough;
    const nextStatus = evaluateStatus({
      // Recompute from scratch rather than from the current status, which is
      // ACTIVE precisely because of the declaration being rejected.
      status: "ACTIVE",
      paidThrough: rollback,
      graceDays: settings.graceDays,
      now: new Date(),
    });
    await prisma.learner.update({
      where: { id: learner.id },
      data: { paidThrough: rollback, billingStatus: nextStatus },
    });
    await prisma.billingAudit.create({
      data: {
        learnerId: learner.id,
        from: learner.billingStatus,
        to: nextStatus,
        reason: `payment rejected (${paymentId})`,
        actorId,
      },
    });
  }
  return updated;
}

/** Administrator override. `null` returns the learner to automatic handling. */
export async function setOverride(
  learnerId: string,
  status: "OVERRIDE_ACTIVE" | "DISABLED" | null,
  actorId: string,
  note: string,
) {
  const settings = await getSettings();
  const learner = await prisma.learner.findUniqueOrThrow({
    where: { id: learnerId },
  });
  const to =
    status ??
    evaluateStatus({
      status: "ACTIVE",
      paidThrough: learner.paidThrough,
      graceDays: settings.graceDays,
      now: new Date(),
    });

  await prisma.learner.update({
    where: { id: learnerId },
    data: {
      billingStatus: to,
      statusOverrideBy: status ? actorId : null,
      statusOverrideNote: status ? note : null,
      statusOverrideAt: status ? new Date() : null,
    },
  });
  await prisma.billingAudit.create({
    data: {
      learnerId,
      from: learner.billingStatus,
      to,
      reason: status ? `override: ${note}` : `override cleared: ${note}`,
      actorId,
    },
  });
}

export type SweepResult = {
  checked: number;
  pastDue: number;
  suspended: number;
  reactivated: number;
};

/**
 * Daily sweep. Idempotent — running it twice in a day changes nothing the
 * second time — so a retried cron job is harmless.
 */
export async function runBillingSweep(now = new Date()): Promise<SweepResult> {
  const settings = await getSettings();
  const learners = await prisma.learner.findMany({
    where: { billingStatus: { notIn: ["OVERRIDE_ACTIVE", "DISABLED"] } },
    select: { id: true, billingStatus: true, paidThrough: true },
  });

  const result: SweepResult = {
    checked: learners.length,
    pastDue: 0,
    suspended: 0,
    reactivated: 0,
  };

  for (const learner of learners) {
    const to = evaluateStatus({
      status: learner.billingStatus,
      paidThrough: learner.paidThrough,
      graceDays: settings.graceDays,
      now,
    });
    if (to === learner.billingStatus) continue;
    await transition(learner.id, learner.billingStatus, to, "daily sweep");
    if (to === "PAST_DUE") result.pastDue++;
    else if (to === "SUSPENDED") result.suspended++;
    else if (to === "ACTIVE") result.reactivated++;
  }
  return result;
}

/** First cycle for a freshly created learner: a full month on the house. */
export function initialPaidThrough(now = new Date()): Date {
  return addCycle(now);
}
