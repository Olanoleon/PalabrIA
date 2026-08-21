import { describe, expect, it } from "vitest";

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
