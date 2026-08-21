import { describe, expect, it } from "vitest";
import {
  addCycle,
  billingView,
  evaluateStatus,
  hasAccess,
  isAdminHeld,
  nextPeriod,
} from "@/lib/billing-rules";

const now = new Date("2026-08-21T12:00:00Z");
const grace = 5;

describe("evaluateStatus", () => {
  it("is ACTIVE while the paid period has not ended", () => {
    expect(
      evaluateStatus({
        status: "ACTIVE",
        paidThrough: new Date("2026-08-25T00:00:00Z"),
        graceDays: grace,
        now,
      }),
    ).toBe("ACTIVE");
  });

  it("flips to PAST_DUE inside the grace window", () => {
    expect(
      evaluateStatus({
        status: "ACTIVE",
        paidThrough: new Date("2026-08-19T12:00:00Z"),
        graceDays: grace,
        now,
      }),
    ).toBe("PAST_DUE");
  });

  it("suspends once the grace window is exhausted", () => {
    expect(
      evaluateStatus({
        status: "PAST_DUE",
        paidThrough: new Date("2026-08-16T12:00:00Z"),
        graceDays: grace,
        now,
      }),
    ).toBe("SUSPENDED");
  });

  it("suspends exactly on the grace boundary, not before", () => {
    const onBoundary = evaluateStatus({
      status: "PAST_DUE",
      paidThrough: new Date("2026-08-16T12:00:01Z"),
      graceDays: grace,
      now,
    });
    expect(onBoundary).toBe("PAST_DUE");
  });

  it("never overrides an administrator hold", () => {
    for (const status of ["OVERRIDE_ACTIVE", "DISABLED"] as const) {
      expect(
        evaluateStatus({
          status,
          paidThrough: new Date("2020-01-01T00:00:00Z"),
          graceDays: grace,
          now,
        }),
      ).toBe(status);
    }
  });

  it("keeps a trial learner in TRIAL until a period exists", () => {
    expect(
      evaluateStatus({ status: "TRIAL", paidThrough: null, graceDays: grace, now }),
    ).toBe("TRIAL");
  });
});

describe("access", () => {
  it("grants access through the grace window and blocks after it", () => {
    expect(hasAccess("TRIAL")).toBe(true);
    expect(hasAccess("ACTIVE")).toBe(true);
    expect(hasAccess("PAST_DUE")).toBe(true);
    expect(hasAccess("OVERRIDE_ACTIVE")).toBe(true);
    expect(hasAccess("SUSPENDED")).toBe(false);
    expect(hasAccess("DISABLED")).toBe(false);
  });

  it("marks only administrator-set statuses as held", () => {
    expect(isAdminHeld("OVERRIDE_ACTIVE")).toBe(true);
    expect(isAdminHeld("DISABLED")).toBe(true);
    expect(isAdminHeld("PAST_DUE")).toBe(false);
  });
});

describe("billingView", () => {
  it("counts days until due and shows the banner inside the window", () => {
    const v = billingView({
      status: "ACTIVE",
      paidThrough: new Date("2026-08-24T12:00:00Z"),
      graceDays: grace,
      now,
    });
    expect(v.daysUntilDue).toBe(3);
    expect(v.daysOverdue).toBeNull();
    expect(v.showBanner).toBe(true);
    expect(v.access).toBe(true);
  });

  it("stays quiet when the next payment is far away", () => {
    const v = billingView({
      status: "ACTIVE",
      paidThrough: new Date("2026-09-15T12:00:00Z"),
      graceDays: grace,
      now,
    });
    expect(v.showBanner).toBe(false);
    expect(v.daysUntilDue).toBe(25);
  });

  it("never nags a learner an administrator has cleared", () => {
    const v = billingView({
      status: "OVERRIDE_ACTIVE",
      paidThrough: new Date("2026-01-01T00:00:00Z"),
      graceDays: grace,
      now,
    });
    expect(v.showBanner).toBe(false);
    expect(v.access).toBe(true);
  });

  it("reports overdue days once suspended", () => {
    const v = billingView({
      status: "ACTIVE",
      paidThrough: new Date("2026-08-01T12:00:00Z"),
      graceDays: grace,
      now,
    });
    expect(v.status).toBe("SUSPENDED");
    expect(v.access).toBe(false);
    expect(v.daysOverdue).toBe(20);
  });
});

describe("cycles", () => {
  it("adds a month", () => {
    expect(addCycle(new Date("2026-08-21T00:00:00Z")).toISOString()).toBe(
      "2026-09-21T00:00:00.000Z",
    );
  });

  it("clamps to the end of a shorter month", () => {
    expect(addCycle(new Date("2026-01-31T00:00:00Z")).toISOString()).toBe(
      "2026-02-28T00:00:00.000Z",
    );
  });

  it("extends from the existing period end when still paid up", () => {
    const paidThrough = new Date("2026-09-10T00:00:00Z");
    const { periodStart, periodEnd } = nextPeriod(paidThrough, now);
    expect(periodStart).toEqual(paidThrough);
    expect(periodEnd.toISOString()).toBe("2026-10-10T00:00:00.000Z");
  });

  it("starts today when the learner is already behind", () => {
    const { periodStart, periodEnd } = nextPeriod(
      new Date("2026-07-01T00:00:00Z"),
      now,
    );
    expect(periodStart).toEqual(now);
    expect(periodEnd.toISOString()).toBe("2026-09-21T12:00:00.000Z");
  });

  it("starts today for a learner with no period at all", () => {
    expect(nextPeriod(null, now).periodStart).toEqual(now);
  });
});
