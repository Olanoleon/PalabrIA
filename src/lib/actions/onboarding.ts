"use server";

import { prisma } from "@/lib/prisma";
import { requireLearner } from "@/lib/rbac";
import { isOnboardingStep } from "@/lib/onboarding";

/**
 * Marks a first-run coach-mark as seen.
 *
 * Deliberately does not revalidate: the client has already hidden the overlay
 * by the time this resolves, and re-rendering the whole screen underneath a
 * dismissal animation makes the card flicker. The next natural navigation picks
 * up the new value.
 */
export async function completeOnboardingStep(step: string) {
  if (!isOnboardingStep(step)) return;
  const { learner } = await requireLearner();
  if (learner.onboardingSteps.includes(step)) return;

  await prisma.learner.update({
    where: { id: learner.id },
    // `push` rather than a read-modify-write so two coach-marks dismissed in
    // quick succession cannot clobber each other.
    data: { onboardingSteps: { push: step } },
  });
}
