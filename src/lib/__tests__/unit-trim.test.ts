import { describe, expect, it } from "vitest";
import { itemCount, trimToBudget } from "@/lib/unit-trim";
import { MAX_ITEMS, type GeneratedUnit } from "@/lib/unit-schema";

function single(text: string): GeneratedUnit["activities"][number] {
  return {
    type: "FILL_BLANK",
    word: text,
    prompt: "Pick one.",
    promptEs: "Elige una.",
    sentence: "This is a ______.",
    options: [text, "other", "third", "fourth"],
    answerIndex: 0,
    note: "n",
    noteEs: "n",
    pairs: null,
  };
}

function matchUp(words: string[]): GeneratedUnit["activities"][number] {
  return {
    type: "MATCH_UP",
    word: words[0],
    prompt: "Match.",
    promptEs: "Une.",
    sentence: null,
    options: [],
    answerIndex: 0,
    note: "n",
    noteEs: "n",
    pairs: words.map((text) => ({ en: text, es: `Una cosa que sirve para ${text}.` })),
  };
}

function draft(activities: GeneratedUnit["activities"]): GeneratedUnit {
  return {
    title: "T",
    subtitle: "s",
    subtitleEs: "s",
    introParagraph: "p",
    introParagraphEs: "p",
    words: [],
    activities,
  };
}

const WORDS = ["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"];

describe("itemCount", () => {
  it("counts a match-up as its pairs", () => {
    expect(itemCount([single("alpha"), matchUp(["a", "b", "c"])])).toBe(4);
  });
});

describe("trimToBudget", () => {
  it("leaves a draft inside the budget alone", () => {
    const unit = draft([...WORDS.slice(0, 5).map(single), matchUp(["x", "y", "z"])]);
    const result = trimToBudget(unit);
    expect(result.dropped).toEqual([]);
    expect(result.unit.activities).toHaveLength(6);
  });

  it("trims down to the budget rather than rejecting the whole draft", () => {
    // 10 singles + a match-up is 13 items; the cap is 11.
    const unit = draft([...WORDS.map(single), single("india"), single("juliet"), matchUp(["x", "y", "z"])]);
    const result = trimToBudget(unit);
    expect(itemCount(result.unit.activities)).toBe(MAX_ITEMS);
    expect(result.dropped).toHaveLength(2);
  });

  it("drops a repeated word before the only cover a word has", () => {
    // "alpha" is practised twice; everything else once.
    const unit = draft([
      ...WORDS.map(single),
      single("alpha"),
      matchUp(["x", "y", "z"]),
    ]);
    const result = trimToBudget(unit);
    expect(result.dropped).toEqual(["alpha"]);
    // Every word still appears at least once.
    const left = result.unit.activities.filter((a) => a.type !== "MATCH_UP").map((a) => a.word);
    expect(new Set(left)).toEqual(new Set(WORDS));
  });

  it("never drops the match-up, which is mandatory and the densest screen", () => {
    const unit = draft([...WORDS.map(single), single("india"), single("juliet"), matchUp(["x", "y", "z"])]);
    const result = trimToBudget(unit);
    expect(result.unit.activities.some((a) => a.type === "MATCH_UP")).toBe(true);
  });

  it("keeps coverage as high as the budget allows for a full-size unit", () => {
    // A 12-word unit cannot practise all 12: 8 singles plus a 3-pair match-up
    // is 11 items, the most a session may hold.
    const twelve = [...WORDS, "india", "juliet", "kilo", "lima"];
    const unit = draft([
      ...twelve.slice(3).map(single), // 9 singles
      matchUp(twelve.slice(0, 3)),
    ]);
    const result = trimToBudget(unit);
    expect(itemCount(result.unit.activities)).toBe(MAX_ITEMS);
    const covered = new Set([
      ...result.unit.activities
        .filter((a) => a.type !== "MATCH_UP")
        .map((a) => a.word),
      ...twelve.slice(0, 3),
    ]);
    expect(covered.size).toBe(11);
  });
});
