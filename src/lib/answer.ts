/**
 * How a typed answer is compared with the word it should spell.
 *
 * Pure and shared, because this comparison exists in three places — the
 * authoritative grader in `progress.ts`, the feedback-only grader in
 * `actions/practice.ts`, and the client that decides when the slots are full.
 * They drifting apart is exactly the bug `grading.test.ts` was written to
 * catch.
 *
 * The keypad has letters and nothing else, so anything else in an entry has to
 * go. Two characters need different treatment:
 *
 * A separator — a space or a hyphen — splits the entry into parts drawn as
 * separate groups of slots, with the gap standing in for the character:
 * "dining room" and "in-laws" are two groups.
 *
 * An apostrophe is not a separator. "Valentine's" is one word that happens to
 * contain a mark the learner cannot tap, so the mark is simply dropped and
 * they type "valentines". Splitting there would draw "Valentine" and "s" as
 * two groups, which is not how the word looks.
 *
 * Both are dropped from the comparison, so an answer matches whether or not
 * the punctuation survives the round trip.
 */

/** Space or hyphen, including the Unicode dashes a word processor produces. */
const SEPARATOR = /[\s\u2010-\u2015-]+/;

/** Straight and curly apostrophes, which a word processor uses interchangeably. */
const APOSTROPHE = /['\u2018\u2019]/g;

/** The word with apostrophes and separators removed, lower-cased. */
export function lettersOnly(text: string): string {
  return text
    .replace(APOSTROPHE, "")
    .replace(new RegExp(SEPARATOR, "g"), "")
    .toLowerCase();
}

/**
 * Letters per part, so "dining room" is [6, 4], "in-laws" is [2, 4] and
 * "Valentine's Day" is [9, 3] — the apostrophe vanishes rather than splitting.
 *
 * Drives the slot groups on the dictation screen; the gap between groups
 * stands in for the space or hyphen.
 */
export function segmentsOf(text: string): number[] {
  return text
    .replace(APOSTROPHE, "")
    .trim()
    .split(SEPARATOR)
    .filter(Boolean)
    .map((part) => part.length);
}

/** How many parts the entry has. Two is the most the dictation UI supports. */
export function wordCountOf(text: string): number {
  return segmentsOf(text).length;
}

/** Whether a typed answer spells the target, ignoring spacing and case. */
export function sameSpelling(typed: string, target: string): boolean {
  const a = lettersOnly(typed);
  return a.length > 0 && a === lettersOnly(target);
}
