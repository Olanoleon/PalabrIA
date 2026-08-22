-- AlterTable
ALTER TABLE "Learner" ADD COLUMN     "onboardingSteps" TEXT[] DEFAULT ARRAY[]::TEXT[];
