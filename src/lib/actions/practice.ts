"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sameSpelling } from "@/lib/answer";
import { requireLearner } from "@/lib/rbac";
import { getSettings, viewFor } from "@/lib/billing";
import { recordPractice, type ResultSummary, type SubmittedAnswer } from "@/lib/progress";

export type CheckResult = {
  correct: boolean;
  /** The right answer, so the feedback panel can name it when they miss. */
  answer: string;
  note: string;
};

/**
 * Grades one question. Kept server-side so answer keys never reach the client;
 * the feedback panel's note is only revealed once the learner has committed.
 */
export async function checkAnswer(
  activityId: string,
  answer: { optionText?: string; typed?: string },
  lang: string,
): Promise<CheckResult> {
  const { learner } = await requireLearner();
  const settings = await getSettings();
  if (!viewFor(learner, settings).access) {
    throw new Error("No access");
  }

  const activity = await prisma.activity.findFirstOrThrow({
    where: {
      id: activityId,
      unit: { area: { scope: "ORG", orgId: learner.orgId } },
    },
    include: { word: { select: { text: true } } },
  });

  const options = Array.isArray(activity.options) ? (activity.options as string[]) : [];
  // Compared by text: the client received the options shuffled, so its notion
  // of "option 2" is not the stored one.
  const correct =
    activity.type === "TYPE_WHAT_YOU_HEAR"
      ? sameSpelling(answer.typed ?? "", activity.word.text)
      : (answer.optionText ?? "").trim() ===
        (options[activity.answerIndex] ?? "").trim();

  return {
    correct,
    answer:
      activity.type === "TYPE_WHAT_YOU_HEAR"
        ? activity.word.text
        : (options[activity.answerIndex] ?? activity.word.text),
    note: lang === "en" ? activity.note : activity.noteEs,
  };
}

/**
 * Submits the whole run. The score, XP, streak and badges are all recomputed
 * here from the stored answer keys, so the client's own tally is presentational.
 */
export async function submitPractice(
  unitId: string,
  answers: SubmittedAnswer[],
): Promise<ResultSummary> {
  const { learner } = await requireLearner();
  const settings = await getSettings();
  if (!viewFor(learner, settings).access) {
    throw new Error("No access");
  }

  // Confirm the unit belongs to this learner's organization and is visible
  // before it can award anything.
  await prisma.unit.findFirstOrThrow({
    where: {
      id: unitId,
      isVisible: true,
      area: { scope: "ORG", orgId: learner.orgId, isVisible: true },
    },
    select: { id: true },
  });

  const summary = await recordPractice(learner.id, unitId, answers);
  revalidatePath("/path");
  revalidatePath("/profile");
  revalidatePath("/leaderboard");
  return summary;
}
