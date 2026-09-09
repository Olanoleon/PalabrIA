/**
 * What counts as an acceptable password, by role.
 *
 * Learners sign in on a phone, often several times a week, and since they
 * self-register there is no administrator to reset anything for them — so they
 * get a 4-digit PIN rather than a password. Administrators reach the console,
 * the billing screens and other organisations' content, so they keep a real
 * minimum length.
 *
 * Pure — no framework, no database, no dictionary — so the rules can be tested
 * directly and so the three callers (signup, change, reset) cannot drift apart
 * the way the old copy in `actions/auth.ts` had already started to.
 *
 * Returns a problem *key* rather than a message: translation is the caller's
 * job, and keeping strings out of here is what makes it framework-free.
 */
import type { Role } from "@/generated/prisma";

/** Digits in a learner's PIN. */
export const PIN_LENGTH = 4;

/** Shortest password an administrator may choose. */
export const MIN_PASSWORD = 8;

const PIN = /^\d{4}$/;

export type PasswordProblem =
  /** Not exactly four digits, for a learner. */
  | "notPin"
  /** Shorter than the minimum, for an administrator. */
  | "short"
  /** The confirmation field does not match. */
  | "mismatch"
  /** An administrator tried to use their own email address. */
  | "sameAsEmail";

/** Whether this role signs in with a PIN rather than a password. */
export function usesPin(role: Role): boolean {
  return role === "LEARNER";
}

export function passwordProblem({
  role,
  password,
  confirm,
  email,
}: {
  role: Role;
  password: string;
  confirm: string;
  email: string;
}): PasswordProblem | null {
  if (usesPin(role)) {
    if (!PIN.test(password)) return "notPin";
    if (password !== confirm) return "mismatch";
    // "Same as email" cannot happen for four digits, so it is not checked.
    return null;
  }

  if (password.length < MIN_PASSWORD) return "short";
  if (password !== confirm) return "mismatch";
  if (password.trim().toLowerCase() === email.trim().toLowerCase()) {
    return "sameAsEmail";
  }
  return null;
}
