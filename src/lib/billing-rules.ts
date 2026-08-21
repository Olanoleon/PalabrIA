/**
 * Pure billing rules — no database, no server-only imports, so the lifecycle is
 * unit-testable.
 *
 * Lifecycle: TRIAL -> ACTIVE <-> PAST_DUE -> SUSPENDED.
 * OVERRIDE_ACTIVE and DISABLED are administrator-set and never touched by the
 * daily sweep.
 */
import type { BillingStatus } from "@/generated/prisma";

export const DAY_MS = 86_400_000;

/** Statuses the automatic sweep must leave alone. */
export function isAdminHeld(status: BillingStatus): boolean {
  return status === "OVERRIDE_ACTIVE" || status === "DISABLED";
}

/** Whether a learner may reach the learning screens at all. */
export function hasAccess(status: BillingStatus): boolean {
  return (
    status === "TRIAL" ||
    status === "ACTIVE" ||
    status === "PAST_DUE" ||
    status === "OVERRIDE_ACTIVE"
  );
}

/**
 * Adds one monthly cycle, clamping to the end of shorter months so a Jan 31
 * cycle lands on Feb 28 rather than skipping into March.
 */
export function addCycle(from: Date): Date {
  const d = new Date(from);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

/** Whole days of `b` minus `a`, positive when b is later. */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

export type StatusInput = {
  status: BillingStatus;
  paidThrough: Date | null;
  graceDays: number;
  now: Date;
};

/**
 * The status a learner should hold right now. Called by the daily sweep and
 * again on read, so a stale row never grants access it should not.
 */
export function evaluateStatus(input: StatusInput): BillingStatus {
  const { status, paidThrough, graceDays, now } = input;
  if (isAdminHeld(status)) return status;
  if (!paidThrough) return status === "TRIAL" ? "TRIAL" : "PAST_DUE";
  if (paidThrough.getTime() >= now.getTime()) return "ACTIVE";
  const overdue = daysBetween(paidThrough, now);
  return overdue >= graceDays ? "SUSPENDED" : "PAST_DUE";
}

export type BillingView = {
  status: BillingStatus;
  access: boolean;
  adminHeld: boolean;
  paidThrough: Date | null;
  daysUntilDue: number | null;
  daysOverdue: number | null;
  /** True when the learner should see a nudge banner on the learning screens. */
  showBanner: boolean;
};

const BANNER_WINDOW_DAYS = 5;

export function billingView(input: StatusInput): BillingView {
  const status = evaluateStatus(input);
  const { paidThrough, now } = input;
  const daysUntilDue =
    paidThrough && paidThrough.getTime() >= now.getTime()
      ? daysBetween(now, paidThrough)
      : null;
  const daysOverdue =
    paidThrough && paidThrough.getTime() < now.getTime()
      ? daysBetween(paidThrough, now)
      : null;
  return {
    status,
    access: hasAccess(status),
    adminHeld: isAdminHeld(input.status),
    paidThrough,
    daysUntilDue,
    daysOverdue,
    showBanner:
      !isAdminHeld(input.status) &&
      (status === "PAST_DUE" ||
        (daysUntilDue !== null && daysUntilDue <= BANNER_WINDOW_DAYS)),
  };
}

/**
 * Where a declared payment moves `paidThrough`. A learner who is behind starts
 * the new cycle today rather than back-filling months they did not pay for.
 */
export function nextPeriod(
  paidThrough: Date | null,
  now: Date,
): { periodStart: Date; periodEnd: Date } {
  const start =
    paidThrough && paidThrough.getTime() > now.getTime() ? paidThrough : now;
  return { periodStart: start, periodEnd: addCycle(start) };
}
