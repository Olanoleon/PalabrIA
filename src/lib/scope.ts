/**
 * Tenant scoping, with no framework imports so it can be exercised directly.
 *
 * These builders are the single place that decides which content a given actor
 * may see, which is what keeps multi-tenant isolation from depending on every
 * caller remembering to filter.
 */
import type { Role } from "@/generated/prisma";

export class Forbidden extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "Forbidden";
  }
}

export type Actor = { id: string; role: Role; orgId: string | null };

export type AreaScope =
  | { scope: "GLOBAL" }
  | { scope: "ORG"; orgId: string }
  | { scope: "ORG"; orgId: string; isVisible: true };

/**
 * Which areas the actor may read.
 *
 * An Org Admin is pinned to their own organization and can never reach the
 * global template. A Super Admin reads the template unless they have entered
 * Organization Mode, in which case `activeOrgId` is that organization. A learner
 * additionally only ever sees visible areas.
 */
export function areaScopeFor(actor: Actor, activeOrgId: string | null): AreaScope {
  if (actor.role === "ORG_ADMIN") {
    if (!actor.orgId) throw new Forbidden("Org admin without an organization");
    return { scope: "ORG", orgId: actor.orgId };
  }
  if (actor.role === "SUPER_ADMIN") {
    return activeOrgId ? { scope: "ORG", orgId: activeOrgId } : { scope: "GLOBAL" };
  }
  if (!actor.orgId) throw new Forbidden("Learner without an organization");
  return { scope: "ORG", orgId: actor.orgId, isVisible: true };
}

/** Throws unless the actor may write to this organization. */
export function assertOrgWriteFor(actor: Actor, orgId: string) {
  if (actor.role === "SUPER_ADMIN") return;
  if (actor.role === "ORG_ADMIN" && actor.orgId === orgId) return;
  throw new Forbidden();
}

/** Only the Super Admin may touch the global template. */
export function assertGlobalWriteFor(actor: Actor) {
  if (actor.role !== "SUPER_ADMIN") throw new Forbidden();
}

export function homeFor(role: Role): string {
  if (role === "SUPER_ADMIN") return "/super";
  if (role === "ORG_ADMIN") return "/admin";
  return "/path";
}
