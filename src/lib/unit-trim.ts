/**
 * Fitting a generated draft into the session budget.
 *
 * A unit is capped at MAX_ITEMS gradeable items so a practice run stays a few
 * minutes on a phone. The model is told the budget, but it is a language model
 * and a large unit tempts it to cover one more word — and a draft one activity
 * over the line was being thrown away wholesale, which is a poor trade for
 * content that is otherwise good.
 *
 * So trim rather than reject. Surplus activities are dropped worst-first:
 * an activity practising a word some other activity already covers goes before
 * one carrying the only appearance of its word, which keeps word coverage as
 * high as the budget allows. The match-up is never dropped — it is mandatory,
 * and at three items it is the most coverage per screen in the set.
 *
 * Pure, so the rule can be reasoned about without a database or a model.
 */
import { MAX_ITEMS, type GeneratedActivity, type GeneratedUnit } from "@/lib/unit-schema";

const normalize = (s: string) => s.trim().toLowerCase();

/** Gradeable items in a draft: a match-up counts as its pairs. */
export function itemCount(activities: GeneratedActivity[]): number {
  return activities.reduce(
    (total, a) => total + (a.type === "MATCH_UP" ? (a.pairs?.length ?? 0) : 1),
    0,
  );
}

export type TrimResult = {
  unit: GeneratedUnit;
  /** Words whose activity was dropped, in the order they were dropped. */
  dropped: string[];
};

export function trimToBudget(unit: GeneratedUnit): TrimResult {
  const dropped: string[] = [];
  if (itemCount(unit.activities) <= MAX_ITEMS) return { unit, dropped };

  // How many activities practise each word, so we can tell a duplicate from
  // the only cover a word has.
  const covers = new Map<string, number>();
  for (const a of unit.activities) {
    if (a.type === "MATCH_UP") {
      for (const pair of a.pairs ?? []) {
        covers.set(normalize(pair.en), (covers.get(normalize(pair.en)) ?? 0) + 1);
      }
      continue;
    }
    covers.set(normalize(a.word), (covers.get(normalize(a.word)) ?? 0) + 1);
  }

  const kept = [...unit.activities];
  while (itemCount(kept) > MAX_ITEMS) {
    // Last redundant activity first; failing that, the last single activity.
    // Scanning from the end keeps the earlier, usually better-formed questions.
    let victim = -1;
    for (let i = kept.length - 1; i >= 0; i--) {
      const a = kept[i];
      if (a.type === "MATCH_UP") continue;
      if ((covers.get(normalize(a.word)) ?? 0) > 1) {
        victim = i;
        break;
      }
    }
    if (victim === -1) {
      victim = kept.findLastIndex((a) => a.type !== "MATCH_UP");
    }
    // Only the match-up is left and it is still over budget: nothing sensible
    // to drop, so hand it back and let validation report it.
    if (victim === -1) break;

    const [removed] = kept.splice(victim, 1);
    covers.set(
      normalize(removed.word),
      (covers.get(normalize(removed.word)) ?? 1) - 1,
    );
    dropped.push(removed.word);
  }

  return { unit: { ...unit, activities: kept }, dropped };
}
