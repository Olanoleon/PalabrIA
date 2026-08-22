/**
 * First-run coach-marks.
 *
 * Each step is shown once per learner, ever, and the fact that it was shown
 * lives on `Learner.onboardingSteps` rather than in the browser — a learner who
 * switches phones should not be taught the app twice, and two learners sharing
 * a phone should each be taught it once.
 *
 * No framework imports, so the step vocabulary can be used from server
 * components, client components and the server action alike.
 */

export const ONBOARDING_STEPS = [
  /** Tap an area to begin — the first area card on /path. */
  "path-tap",
  /** Tap a word card to flip it — inside the first unit opened. */
  "unit-cards",
  /** Review the cards before practising — gates Practice on the first unit. */
  "unit-practice",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function isOnboardingStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/**
 * Whether a step still needs showing.
 *
 * Unknown keys stored on the record are ignored rather than erroring, so a
 * retired step can simply be deleted from `ONBOARDING_STEPS` with no migration.
 */
export function needsStep(done: string[], step: OnboardingStep): boolean {
  return !done.includes(step);
}
