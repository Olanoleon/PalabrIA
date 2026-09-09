import { t, type Lang } from "@/lib/i18n";
import type { PasswordProblem } from "@/lib/password";

/**
 * Turns a rule violation into something to show the person who hit it.
 *
 * Separate from `password.ts` so the rules stay free of copy, and separate from
 * the action files because a `"use server"` module may only export async
 * functions.
 */
export function passwordMessage(problem: PasswordProblem, lang: Lang): string {
  const d = t(lang);
  switch (problem) {
    case "notPin":
      return d.pwNotPin;
    case "short":
      return d.newPwShort;
    case "mismatch":
      return d.newPwMismatch;
    case "sameAsEmail":
      return d.newPwSameAsEmail;
  }
}
