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

/**
 * How long a brand-new learner gets for free.
 *
 * Eight days, and deliberately without a grace period afterwards: a trial that
 * quietly runs to thirteen is not the eight days anyone was promised. The
 * grace still applies to somebody who has paid before and is late, where it is
 * usually a bank delay rather than a decision.
 */
export const TRIAL_DAYS = 8;

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
  /** Whether the learner's organisation is invoiced instead of the learner. */
  orgPaid?: boolean;
};

/**
 * The status a learner should hold right now. Called by the daily sweep and
 * again on read, so a stale row never grants access it should not.
 */
export function evaluateStatus(input: StatusInput): BillingStatus {
  const { status, paidThrough, graceDays, now } = input;
  if (isAdminHeld(status)) return status;
  if (!paidThrough) return status === "TRIAL" ? "TRIAL" : "PAST_DUE";

  const live = paidThrough.getTime() >= now.getTime();

  // A trial stays a trial while it lasts, rather than reading as ACTIVE the way
  // it used to. The distinction is load-bearing now: it is what lets the app
  // say "your trial ends in three days" instead of implying a subscription
  // nobody bought, and it is how the rule below knows there is nothing to be
  // late with.
  if (status === "TRIAL") return live ? "TRIAL" : "SUSPENDED";

  if (live) return "ACTIVE";

  // Suspension is left by paying, which pushes paidThrough into the future and
  // is caught above — never by time passing. Without this, an expired trial
  // would be suspended by the sweep and then read as PAST_DUE the very next
  // time anyone looked at it, because it is only a day overdue and a day is
  // inside the grace window. PAST_DUE still has access, so the lock would
  // quietly undo itself.
  if (status === "SUSPENDED") return "SUSPENDED";

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
  /**
   * The organisation is invoiced outside the app, so none of this is the
   * learner's business. Every money-shaped surface keys off this: the payments
   * tab, the banner, the amount on the profile screen.
   */
  orgPaid: boolean;
  /** True while the free period is running, so copy can say so. */
  onTrial: boolean;
};

const BANNER_WINDOW_DAYS = 5;

export function billingView(input: StatusInput): BillingView {
  const status = evaluateStatus(input);
  const { paidThrough, now, orgPaid = false } = input;

  // An organisation that pays for its people keeps them open, with one
  // exception: DISABLED is an explicit administrative hold on that individual
  // and outranks whoever is footing the bill.
  if (orgPaid && input.status !== "DISABLED") {
    return {
      status,
      access: true,
      adminHeld: isAdminHeld(input.status),
      // Nulled rather than passed through: there is no due date to show
      // someone who is not being billed.
      paidThrough: null,
      daysUntilDue: null,
      daysOverdue: null,
      showBanner: false,
      orgPaid: true,
      onTrial: false,
    };
  }
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
    orgPaid: false,
    onTrial: status === "TRIAL",
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
