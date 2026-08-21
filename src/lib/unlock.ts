/**
 * Unit progression. A unit opens when the previous visible unit in its area has
 * been passed; the first one is always open. Hidden units are skipped entirely,
 * so hiding a mid-area unit closes the gap instead of walling the area off.
 */
import { PASS_THRESHOLD } from "@/lib/xp";

export type UnitLike = { id: string; sortOrder: number; isVisible: boolean };

export type UnitState = "passed" | "current" | "locked";

export function isPassed(score: number | undefined | null): boolean {
  return (score ?? 0) >= PASS_THRESHOLD;
}

/**
 * State of every visible unit in an area, in order.
 *
 * "current" is the first unit that has not been passed — the one the learner is
 * being pointed at. Everything after it is locked.
 */
export function unitStates<T extends UnitLike>(
  units: T[],
  scoreById: Map<string, number>,
): Array<{ unit: T; state: UnitState; score: number; index: number }> {
  const visible = units
    .filter((u) => u.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  let currentAssigned = false;
  return visible.map((unit, index) => {
    const score = scoreById.get(unit.id) ?? 0;
    if (isPassed(score)) return { unit, state: "passed" as const, score, index };
    if (!currentAssigned) {
      currentAssigned = true;
      return { unit, state: "current" as const, score, index };
    }
    return { unit, state: "locked" as const, score, index };
  });
}

export function canOpen<T extends UnitLike>(
  units: T[],
  scoreById: Map<string, number>,
  unitId: string,
): boolean {
  const state = unitStates(units, scoreById).find((s) => s.unit.id === unitId);
  return !!state && state.state !== "locked";
}

/** 1-based position of the unit a learner must pass to open `unitId`. */
export function blockingUnitNumber<T extends UnitLike>(
  units: T[],
  scoreById: Map<string, number>,
): number {
  const states = unitStates(units, scoreById);
  const current = states.find((s) => s.state === "current");
  return (current?.index ?? 0) + 1;
}

export function passedCount<T extends UnitLike>(
  units: T[],
  scoreById: Map<string, number>,
): number {
  return unitStates(units, scoreById).filter((s) => s.state === "passed").length;
}

export function areaComplete<T extends UnitLike>(
  units: T[],
  scoreById: Map<string, number>,
): boolean {
  const states = unitStates(units, scoreById);
  return states.length > 0 && states.every((s) => s.state === "passed");
}
