import { describe, expect, it } from "vitest";
import {
  areaComplete,
  blockingUnitNumber,
  canOpen,
  passedCount,
  unitStates,
} from "@/lib/unlock";

const units = [
  { id: "u1", sortOrder: 0, isVisible: true },
  { id: "u2", sortOrder: 1, isVisible: true },
  { id: "u3", sortOrder: 2, isVisible: true },
];

const scores = (m: Record<string, number>) => new Map(Object.entries(m));

describe("unitStates", () => {
  it("opens the first unit and locks the rest", () => {
    const states = unitStates(units, scores({}));
    expect(states.map((s) => s.state)).toEqual(["current", "locked", "locked"]);
  });

  it("advances the current unit as units are passed", () => {
    expect(
      unitStates(units, scores({ u1: 70 })).map((s) => s.state),
    ).toEqual(["passed", "current", "locked"]);
    expect(
      unitStates(units, scores({ u1: 100, u2: 83 })).map((s) => s.state),
    ).toEqual(["passed", "passed", "current"]);
  });

  it("treats 69% as not passed and 70% as passed", () => {
    expect(unitStates(units, scores({ u1: 69 }))[0].state).toBe("current");
    expect(unitStates(units, scores({ u1: 70 }))[0].state).toBe("passed");
  });

  it("skips hidden units so hiding one does not wall off the area", () => {
    const withHidden = [
      { id: "u1", sortOrder: 0, isVisible: true },
      { id: "u2", sortOrder: 1, isVisible: false },
      { id: "u3", sortOrder: 2, isVisible: true },
    ];
    const states = unitStates(withHidden, scores({ u1: 90 }));
    expect(states.map((s) => s.unit.id)).toEqual(["u1", "u3"]);
    expect(states[1].state).toBe("current");
  });

  it("orders by sortOrder, not array order", () => {
    const shuffled = [units[2], units[0], units[1]];
    expect(unitStates(shuffled, scores({})).map((s) => s.unit.id)).toEqual([
      "u1",
      "u2",
      "u3",
    ]);
  });
});

describe("canOpen", () => {
  it("allows the current and passed units only", () => {
    const s = scores({ u1: 90 });
    expect(canOpen(units, s, "u1")).toBe(true);
    expect(canOpen(units, s, "u2")).toBe(true);
    expect(canOpen(units, s, "u3")).toBe(false);
  });

  it("refuses a hidden unit even when it would be next", () => {
    const withHidden = [
      { id: "u1", sortOrder: 0, isVisible: true },
      { id: "u2", sortOrder: 1, isVisible: false },
    ];
    expect(canOpen(withHidden, scores({ u1: 90 }), "u2")).toBe(false);
  });

  it("refuses an unknown unit id", () => {
    expect(canOpen(units, scores({}), "nope")).toBe(false);
  });
});

describe("counters", () => {
  it("names the unit that must be passed next", () => {
    expect(blockingUnitNumber(units, scores({}))).toBe(1);
    expect(blockingUnitNumber(units, scores({ u1: 80 }))).toBe(2);
  });

  it("counts passes and completion", () => {
    expect(passedCount(units, scores({ u1: 80, u2: 70 }))).toBe(2);
    expect(areaComplete(units, scores({ u1: 80, u2: 70 }))).toBe(false);
    expect(areaComplete(units, scores({ u1: 80, u2: 70, u3: 100 }))).toBe(true);
  });

  it("does not call an empty area complete", () => {
    expect(areaComplete([], scores({}))).toBe(false);
  });
});
