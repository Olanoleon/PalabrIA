/**
 * How a typed answer is compared with the word it should spell.
 *
 * Pure and shared, because this comparison exists in three places — the
 * authoritative grader in `progress.ts`, the feedback-only grader in
 * `actions/practice.ts`, and the client that decides when the slots are full.
 * They drifting apart is exactly the bug `grading.test.ts` was written to
 * catch.
 *
 * Whitespace is dropped on both sides. Vocabulary entries may be two words
 * ("dining room"), but the letter keypad has no space key: the learner types
 * letters only and the gap between slot groups is drawn for them.
 */

/** The word with every space removed, lower-cased. */
export function lettersOnly(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

/** How many words the entry has. Two is the most the dictation UI supports. */
export function wordCountOf(text: string): number {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

/** Whether a typed answer spells the target, ignoring spacing and case. */
export function sameSpelling(typed: string, target: string): boolean {
  const a = lettersOnly(typed);
  return a.length > 0 && a === lettersOnly(target);
}
