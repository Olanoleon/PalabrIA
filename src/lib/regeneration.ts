/**
 * When a background regeneration counts as running.
 *
 * Pure and framework-free so both the console reads and the action agree, and
 * so the stale rule can be tested without a database.
 */

/**
 * A run older than this is treated as dead rather than as running.
 *
 * The work is a detached promise inside the server process: a deploy, a crash
 * or a restart in the middle of one leaves `regeneratingSince` set with nobody
 * left to clear it, and without this the unit would stay locked forever. Ten
 * minutes is comfortably past the model's own 150-second timeout.
 */
export const REGENERATION_STALE_MIN = 10;

export type RegenerationState = "idle" | "running" | "stale";

export function regenerationState(
  since: Date | null | undefined,
  now: Date = new Date(),
): RegenerationState {
  if (!since) return "idle";
  const minutes = (now.getTime() - since.getTime()) / 60_000;
  return minutes < REGENERATION_STALE_MIN ? "running" : "stale";
}

/** True only while a unit should be locked in the console. */
export function isRegenerating(
  since: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return regenerationState(since, now) === "running";
}
