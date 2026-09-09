import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * The only reads an unauthenticated visitor can cause.
 *
 * Deliberately not in `admin-data.ts`: everything there assumes an actor and a
 * scope, and `organizationRows()` in particular returns learner counts and
 * every org admin's name and email. Nothing here returns more than an
 * organisation's id and display name.
 */

/** Digits a learner types, or the tail of a /join/<code> link. */
const CODE = /^\d{4}$/;

/**
 * Where someone lands when they register without a code.
 *
 * An environment variable rather than a hardcoded name so the demo org can be
 * swapped without a deploy of new code. The default is what
 * `slugify("Leo's Friends")` produces in `scripts/seed-owner.mts`.
 */
export const DEMO_ORG_SLUG =
  process.env.PUBLIC_SIGNUP_ORG_SLUG ?? "leo-s-friends";

export type PublicOrg = { id: string; name: string };

/** Trims and rejects anything that is not four digits. */
export function normalizeJoinCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim();
  return CODE.test(code) ? code : null;
}

export async function orgByJoinCode(raw: string): Promise<PublicOrg | null> {
  const code = normalizeJoinCode(raw);
  if (!code) return null;
  return prisma.organization.findFirst({
    // `isActive` is checked here because nothing else checks it. Deactivating
    // an organisation flips its existing members to inactive, but a learner who
    // joined afterwards would be created active and could sign in.
    where: { joinCode: code, isActive: true },
    select: { id: true, name: true },
  });
}

export async function demoOrg(): Promise<PublicOrg | null> {
  return prisma.organization.findFirst({
    where: { slug: DEMO_ORG_SLUG, isActive: true },
    select: { id: true, name: true },
  });
}

export type SignupTarget =
  | { ok: true; org: PublicOrg; demo: boolean }
  /** Four digits that belong to no active organisation. */
  | { ok: false; reason: "badCode" }
  /** No code given, and the demo organisation is missing or deactivated. */
  | { ok: false; reason: "noDemo" };

/**
 * What an empty or filled code field means.
 *
 * The single place that decides which organisation a registration joins. The
 * signup action calls it again with the submitted code rather than trusting an
 * id from the form, so a crafted post cannot place someone in an organisation
 * they have no code for.
 */
export async function orgForSignup(
  raw: string | null | undefined,
): Promise<SignupTarget> {
  const code = (raw ?? "").trim();

  if (code.length === 0) {
    const org = await demoOrg();
    return org ? { ok: true, org, demo: true } : { ok: false, reason: "noDemo" };
  }

  const org = await orgByJoinCode(code);
  return org ? { ok: true, org, demo: false } : { ok: false, reason: "badCode" };
}
