import { describe, expect, it } from "vitest";
import { sameSpelling } from "@/lib/answer";

/**
 * Multiple-choice answers are graded by the chosen option's TEXT, never its
 * position, because the server shuffles the options on every practice load.
 * This mirrors the comparison in `progress.ts` and `actions/practice.ts`; if
 * either drifts back to comparing indices, these fail.
 */
function gradeChoice(
  storedOptions: string[],
  storedAnswerIndex: number,
  chosenText: string | undefined,
): boolean {
  const correctText = storedOptions[storedAnswerIndex];
  const chosen = (chosenText ?? "").trim();
  return chosen.length > 0 && chosen === (correctText ?? "").trim();
}

/** Fisher-Yates, as used server-side. */
function shuffled<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Stored the way both the seed and the model produce it: correct answer first.
const STORED = ["eyebrow", "eyelash", "forehead", "cheek"];
const ANSWER_INDEX = 0;

describe("multiple-choice grading", () => {
  it("accepts the right answer", () => {
    expect(gradeChoice(STORED, ANSWER_INDEX, "eyebrow")).toBe(true);
  });

  it("rejects a wrong answer", () => {
    expect(gradeChoice(STORED, ANSWER_INDEX, "eyelash")).toBe(false);
  });

  it("rejects an unanswered question", () => {
    expect(gradeChoice(STORED, ANSWER_INDEX, undefined)).toBe(false);
    expect(gradeChoice(STORED, ANSWER_INDEX, "")).toBe(false);
  });

  it("is unaffected by where the shuffle put the answer", () => {
    // Whatever position the learner saw it in, the text still grades correctly.
    for (let run = 0; run < 200; run++) {
      const presented = shuffled(STORED);
      const chosenPosition = presented.indexOf("eyebrow");
      expect(gradeChoice(STORED, ANSWER_INDEX, presented[chosenPosition])).toBe(true);

      // ...and picking any other position is wrong, wherever it landed.
      for (let i = 0; i < presented.length; i++) {
        if (i === chosenPosition) continue;
        expect(gradeChoice(STORED, ANSWER_INDEX, presented[i])).toBe(false);
      }
    }
  });

  it("would have been fooled by index comparison", () => {
    // The old behaviour: the learner picks position 0 of what they were shown.
    // Correct only when the shuffle happened to leave the answer first — which
    // is exactly the bug, since it always did.
    const presented = ["cheek", "eyebrow", "eyelash", "forehead"];
    const pickedIndex = 0;
    expect(pickedIndex === ANSWER_INDEX).toBe(true); // index says "correct"
    expect(gradeChoice(STORED, ANSWER_INDEX, presented[pickedIndex])).toBe(false); // text says otherwise
  });

  it("tolerates stray whitespace on either side", () => {
    expect(gradeChoice(["  eyebrow  ", "cheek"], 0, "eyebrow")).toBe(true);
    expect(gradeChoice(["eyebrow", "cheek"], 0, " eyebrow ")).toBe(true);
  });
});

describe("shuffle", () => {
  it("keeps every option exactly once", () => {
    for (let run = 0; run < 100; run++) {
      expect([...shuffled(STORED)].sort()).toEqual([...STORED].sort());
    }
  });

  it("does not leave the answer first every time", () => {
    // The whole point: across many loads the answer must move around.
    const firsts = new Set<string>();
    for (let run = 0; run < 200; run++) firsts.add(shuffled(STORED)[0]);
    expect(firsts.size).toBeGreaterThan(1);
  });
});

/**
 * Dictation is graded on letters alone.
 *
 * A vocabulary entry may be two words ("dining room"), but the letter keypad
 * has no space key — the slots are drawn as two groups and the learner types
 * ten letters. `sameSpelling` is the shared comparison both graders call; if
 * either goes back to comparing the raw strings, two-word entries become
 * impossible to answer correctly and these fail.
 */
describe("dictation grading", () => {
  it("accepts a single word", () => {
    expect(sameSpelling("eyebrow", "eyebrow")).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(sameSpelling("  EyeBrow ", "eyebrow")).toBe(true);
  });

  it("accepts a two-word entry typed without its space", () => {
    expect(sameSpelling("diningroom", "dining room")).toBe(true);
  });

  it("still accepts it if a space does come through", () => {
    expect(sameSpelling("dining room", "dining room")).toBe(true);
  });

  it("rejects a wrong spelling", () => {
    expect(sameSpelling("diningrom", "dining room")).toBe(false);
  });

  it("rejects an empty answer rather than matching an empty target", () => {
    expect(sameSpelling("", "")).toBe(false);
    expect(sameSpelling("   ", "dining room")).toBe(false);
  });
});

/**
 * A match-up is stored as three ordinary rows sharing a `matchGroup`: same
 * three meanings in `options`, a different `answerIndex` each. That is what
 * lets the existing text comparison grade it, and what gives partial credit
 * for free — so it must survive the per-load shuffle like any other question.
 */
describe("match-up grading", () => {
  const MEANINGS = ["la ceja", "la pestaña", "la frente"];
  const ROWS = [
    { en: "eyebrow", answerIndex: 0 },
    { en: "eyelash", answerIndex: 1 },
    { en: "forehead", answerIndex: 2 },
  ];

  it("grades each pairing independently", () => {
    // One right and the other two swapped, which is what the board actually
    // produces: a meaning belongs to one word at a time, so a mistake here is
    // normally a transposition rather than a stray duplicate.
    const chosen = {
      eyebrow: "la ceja",
      eyelash: "la frente",
      forehead: "la pestaña",
    };
    const results = ROWS.map((row) =>
      gradeChoice(MEANINGS, row.answerIndex, chosen[row.en as keyof typeof chosen]),
    );
    // Partial credit: one right, two wrong — not all-or-nothing.
    expect(results).toEqual([true, false, false]);
  });

  it("is unaffected by the order the meanings are presented in", () => {
    for (let run = 0; run < 200; run++) {
      const presented = shuffled(MEANINGS);
      for (const row of ROWS) {
        // The learner taps the meaning wherever it appears; the text is what
        // travels back, so the stored answerIndex still resolves it.
        const tapped = presented.find((m) => m === MEANINGS[row.answerIndex])!;
        expect(gradeChoice(MEANINGS, row.answerIndex, tapped)).toBe(true);
      }
    }
  });
});
