import { describe, expect, it } from "vitest";
import { hasBlockingIssue, validateGeneratedUnit } from "@/lib/unit-validate";
import type { GeneratedUnit } from "@/lib/unit-schema";

function word(text: string) {
  return {
    text,
    translation: `la ${text}`,
    definition: `The ${text}.`,
    definitionEs: `La ${text}.`,
    ipa: `/${text}/`,
    syllables: text.toUpperCase(),
    stress: text,
    pos: "sustantivo",
    exampleSentence: `This is a ${text}.`,
    exampleSentenceEs: `Esto es un ${text}.`,
  };
}

function activity(
  text: string,
  type: GeneratedUnit["activities"][number]["type"],
): GeneratedUnit["activities"][number] {
  return type === "TYPE_WHAT_YOU_HEAR"
    ? {
        type,
        word: text,
        prompt: "Listen and spell.",
        promptEs: "Escucha y escribe.",
        sentence: null,
        options: [],
        answerIndex: 0,
        note: "n",
        noteEs: "n",
        pairs: null,
      }
    : {
        type,
        word: text,
        prompt: "Pick one.",
        promptEs: "Elige una.",
        sentence: type === "FILL_BLANK" ? "This is a ______." : null,
        options: [text, "other", "third", "fourth"],
        answerIndex: 0,
        note: "n",
        noteEs: "n",
        pairs: null,
      };
}

/** A match-up over three of the unit's words. Every unit must carry one. */
function matchUp(words: string[]): GeneratedUnit["activities"][number] {
  return {
    type: "MATCH_UP",
    word: words[0],
    prompt: "Match each word with its meaning.",
    promptEs: "Une cada palabra con su significado.",
    sentence: null,
    options: [],
    answerIndex: 0,
    note: "n",
    noteEs: "n",
    pairs: words.map((text) => ({ en: text, es: `la ${text}` })),
  };
}

const SINGLE_TYPES = ["FILL_BLANK", "IPA_MATCH", "TYPE_WHAT_YOU_HEAR"] as const;

/**
 * A unit shaped the way the generator is now asked to produce them: one
 * activity per word, plus a mandatory match-up over the last three, inside the
 * 11-item budget.
 *
 * The earlier builder emitted three activities regardless of word count, which
 * is 50% coverage — below the bar these tests now assert, so every case built
 * on it would have failed for the wrong reason.
 */
function unit(words: string[]): GeneratedUnit {
  const paired = words.slice(-3);
  const singles = words
    .filter((w) => !paired.includes(w))
    // A match-up is 3 items, so 8 singles is the most that fits in 11.
    .slice(0, 8);
  return {
    title: "Test unit",
    subtitle: `${words.length} palabras`,
    subtitleEs: `${words.length} words`,
    introParagraph: words.join(" ") + " together in one paragraph.",
    introParagraphEs: "Un párrafo.",
    words: words.map(word),
    activities: [
      // Cycled so the first three indices stay FILL_BLANK, IPA_MATCH and
      // TYPE_WHAT_YOU_HEAR, which several cases below address positionally.
      ...singles.map((text, i) => activity(text, SINGLE_TYPES[i % 3])),
      matchUp(paired),
    ],
  };
}

const SIX = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"];

describe("validateGeneratedUnit", () => {
  it("accepts a well-formed unit", () => {
    const issues = validateGeneratedUnit(unit(SIX), { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("warns when the count differs from what was asked", () => {
    const issues = validateGeneratedUnit(unit(SIX), { wordCount: 8 });
    expect(hasBlockingIssue(issues)).toBe(false);
    expect(issues.some((i) => i.message.includes("8 were requested"))).toBe(true);
  });

  it("blocks a unit below the minimum size", () => {
    const issues = validateGeneratedUnit(unit(["one", "two", "three"]), {
      wordCount: 3,
    });
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("blocks a unit above the maximum size", () => {
    const many = Array.from({ length: 13 }, (_, i) => `w${i}`);
    const issues = validateGeneratedUnit(unit(many), { wordCount: 13 });
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("blocks duplicate words, case-insensitively", () => {
    const draft = unit(SIX);
    draft.words[1] = word("Alpha");
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.toLowerCase().includes("duplicate"))).toBe(true);
  });

  it("blocks when a mandatory word from the list is missing", () => {
    const issues = validateGeneratedUnit(unit(SIX), {
      wordCount: 6,
      wordList: ["alpha", "zulu"],
    });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("zulu"))).toBe(true);
  });

  it("treats an explicit list longer than the count as the target", () => {
    const seven = [...SIX, "golf"];
    const issues = validateGeneratedUnit(unit(seven), {
      wordCount: 5,
      wordList: seven,
    });
    // Seven words for a list of seven is correct even though 5 was requested.
    expect(issues.some((i) => i.message.includes("were requested"))).toBe(false);
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("blocks an activity that references a word outside the unit", () => {
    const draft = unit(SIX);
    draft.activities.push(activity("zulu", "FILL_BLANK"));
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("blocks an answer index that points nowhere", () => {
    const draft = unit(SIX);
    draft.activities[0].answerIndex = 9;
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("blocks a multiple-choice activity with fewer than two options", () => {
    const draft = unit(SIX);
    draft.activities[0].options = ["only"];
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("blocks a unit with no activities at all", () => {
    const draft = unit(SIX);
    draft.activities = [];
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("allows a two-word dictation", () => {
    // The keypad has no space key but does not need one: "dining room" is drawn
    // as two groups of slots and typed as ten letters.
    const draft = unit([...SIX.slice(0, 5), "dining room"]);
    draft.activities[2] = activity("dining room", "TYPE_WHAT_YOU_HEAR");
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("blocks a dictation of three words or more", () => {
    const draft = unit([...SIX.slice(0, 5), "out of the blue"]);
    draft.activities[2] = activity("out of the blue", "TYPE_WHAT_YOU_HEAR");
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("at most two words"))).toBe(true);
  });

  it("allows a multi-word entry on the multiple-choice types", () => {
    const draft = unit([...SIX.slice(0, 5), "cutting board"]);
    draft.activities[0] = activity("cutting board", "FILL_BLANK");
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("only warns about a dictation that came back with options", () => {
    const draft = unit(SIX);
    draft.activities[2].options = ["a", "b"];
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(false);
    expect(issues.some((i) => i.level === "warning")).toBe(true);
  });

  it("only warns about a fill-in-the-blank with no blank", () => {
    const draft = unit(SIX);
    draft.activities[0].sentence = "No blank here.";
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("only warns about IPA without slashes", () => {
    const draft = unit(SIX);
    draft.words[0] = { ...draft.words[0], ipa: "alpha" };
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(false);
    expect(issues.some((i) => i.message.includes("without slashes"))).toBe(true);
  });

  it("warns when the paragraph barely uses the unit words", () => {
    const draft = unit(SIX);
    draft.introParagraph = "Nothing relevant appears in this text.";
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(issues.some((i) => i.message.includes("paragraph uses few"))).toBe(true);
  });

  it("warns when an activity kind is missing", () => {
    const draft = unit(SIX);
    // Drop the kind but keep the match-up and enough coverage, so the only
    // thing this case is testing is the missing kind.
    draft.activities = draft.activities.filter((a) => a.type !== "IPA_MATCH");
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(issues.some((i) => i.message.includes("IPA_MATCH"))).toBe(true);
    expect(hasBlockingIssue(issues)).toBe(false);
  });

  it("blocks a unit that practises too few of its words", () => {
    const draft = unit(SIX);
    // Match-up only: three of six words is 50%, under the 70% bar.
    draft.activities = draft.activities.filter((a) => a.type === "MATCH_UP");
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("words are practised"))).toBe(true);
  });

  it("counts a match-up's three words toward coverage", () => {
    const draft = unit(SIX);
    // Four singles plus the match-up's three would be seven of six words; the
    // point is that the match-up contributes all three, not just its anchor.
    const covered = new Set(
      draft.activities.flatMap((a) =>
        a.type === "MATCH_UP" ? (a.pairs ?? []).map((p) => p.en) : [a.word],
      ),
    );
    expect(covered.size).toBe(6);
    expect(hasBlockingIssue(validateGeneratedUnit(draft, { wordCount: 6 }))).toBe(
      false,
    );
  });

  it("blocks a unit with more gradeable items than the budget", () => {
    const draft = unit(SIX);
    // Three singles + a match-up is 6 items; six more takes it to 12.
    for (const text of SIX) {
      draft.activities.push(activity(text, "FILL_BLANK"));
    }
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("gradeable items"))).toBe(true);
  });

  it("blocks a unit with no match-up", () => {
    const draft = unit(SIX);
    draft.activities = draft.activities.filter((a) => a.type !== "MATCH_UP");
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("exactly one match-up"))).toBe(
      true,
    );
  });

  it("blocks a match-up with the wrong number of pairs", () => {
    const draft = unit(SIX);
    const match = draft.activities.find((a) => a.type === "MATCH_UP")!;
    match.pairs = (match.pairs ?? []).slice(0, 2);
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("exactly 3"))).toBe(true);
  });

  it("blocks a match-up whose meanings repeat, which makes a pairing ambiguous", () => {
    const draft = unit(SIX);
    const match = draft.activities.find((a) => a.type === "MATCH_UP")!;
    match.pairs = (match.pairs ?? []).map((pair) => ({ ...pair, es: "lo mismo" }));
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("ambiguous"))).toBe(true);
  });
});
