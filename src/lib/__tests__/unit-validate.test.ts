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
      };
}

function unit(words: string[]): GeneratedUnit {
  return {
    title: "Test unit",
    subtitle: `${words.length} palabras`,
    subtitleEs: `${words.length} words`,
    introParagraph: words.join(" ") + " together in one paragraph.",
    introParagraphEs: "Un párrafo.",
    words: words.map(word),
    activities: [
      activity(words[0], "FILL_BLANK"),
      activity(words[1] ?? words[0], "IPA_MATCH"),
      activity(words[2] ?? words[0], "TYPE_WHAT_YOU_HEAR"),
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

  it("blocks a dictation whose answer is more than one word", () => {
    // The letter keypad has no space key, so "cutting board" is untypeable.
    const draft = unit([...SIX.slice(0, 5), "cutting board"]);
    draft.activities[2] = activity("cutting board", "TYPE_WHAT_YOU_HEAR");
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(hasBlockingIssue(issues)).toBe(true);
    expect(issues.some((i) => i.message.includes("no space key"))).toBe(true);
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
    draft.activities = [activity("alpha", "FILL_BLANK")];
    const issues = validateGeneratedUnit(draft, { wordCount: 6 });
    expect(issues.some((i) => i.message.includes("IPA_MATCH"))).toBe(true);
    expect(hasBlockingIssue(issues)).toBe(false);
  });
});
