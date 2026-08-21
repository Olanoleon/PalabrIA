/**
 * Authorization and tenant scoping.
 *
 * Multi-tenant isolation is enforced here rather than by convention: callers
 * ask for an actor-scoped filter and cannot accidentally query across orgs.
 */
import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { currentUser, type CurrentUser } from "@/lib/auth";
import {
  Forbidden,
  areaScopeFor,
  assertGlobalWriteFor,
  assertOrgWriteFor,
  homeFor,
} from "@/lib/scope";
import type { Role } from "@/generated/prisma";

export type { CurrentUser };

export const ORG_MODE_COOKIE = "pal_org_mode";

export { Forbidden, homeFor };

export async function requireUser(): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/new-password");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export async function requireLearner() {
  const user = await requireUser();
  if (user.role !== "LEARNER" || !user.learner) redirect(homeFor(user.role));
  return { user, learner: user.learner };
}

/**
 * The organization whose content the actor is working on.
 *
 * An Org Admin is always pinned to their own org. A Super Admin has no org of
 * their own and must explicitly enter Organization Mode, which is what makes
 * "am I editing the global template or one organization?" unambiguous.
 */
export async function activeOrgId(user: CurrentUser): Promise<string | null> {
  if (user.role === "ORG_ADMIN") return user.orgId;
  if (user.role === "SUPER_ADMIN") {
    const cookie = (await cookies()).get(ORG_MODE_COOKIE)?.value;
    return cookie || null;
  }
  return user.orgId;
}

/** Where clause restricting Areas to what the actor may see. */
export async function areaScopeFilter(user: CurrentUser) {
  return areaScopeFor(user, await activeOrgId(user));
}

export function assertOrgWrite(user: CurrentUser, orgId: string) {
  assertOrgWriteFor(user, orgId);
}

export function assertGlobalWrite(user: CurrentUser) {
  assertGlobalWriteFor(user);
}
