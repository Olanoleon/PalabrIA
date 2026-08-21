-- PalabrIA — full schema bootstrap for an EMPTY database.
--
-- Generated with:
--   npm run db:sql
-- (prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script)
--
-- This is the ALTERNATIVE path, for pasting into the Neon SQL Editor when you
-- cannot run the CLI. The normal path is `npm run db:deploy`.
--
-- IMPORTANT: applying this file does NOT populate Prisma's _prisma_migrations
-- table, so the next `prisma migrate deploy` would try to re-create everything
-- and fail. After running this once, mark the existing migrations as applied:
--
--   npx prisma migrate resolve --applied 20260821075046_init
--   npx prisma migrate resolve --applied 20260821084311_payment_previous_period
--
-- Verify with `npm run db:status` — it should report "Database schema is up to date!".
--
-- Creates 17 tables, 9 enum types, 23 indexes and 20 foreign keys.
-- Safe on an empty database only; it does not use IF NOT EXISTS on tables.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LEARNER', 'ORG_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UiLang" AS ENUM ('es', 'en');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'OVERRIDE_ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AreaScope" AS ENUM ('GLOBAL', 'ORG');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('VERY_EASY', 'EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('FILL_BLANK', 'IPA_MATCH', 'TYPE_WHAT_YOU_HEAR');

-- CreateEnum
CREATE TYPE "XpReason" AS ENUM ('UNIT_PASS', 'UNIT_IMPROVE', 'ATTEMPT_EFFORT', 'FLAWLESS', 'AREA_COMPLETE', 'STREAK_DAY', 'STREAK_MILESTONE');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('TWO_FACTOR', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "brebKey" TEXT NOT NULL DEFAULT '',
    "monthlyAmount" INTEGER NOT NULL DEFAULT 25000,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "graceDays" INTEGER NOT NULL DEFAULT 5,
    "openaiModel" TEXT NOT NULL DEFAULT 'gpt-5',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "uiLang" "UiLang" NOT NULL DEFAULT 'es',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Learner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "team" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "streakLastDay" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'TRIAL',
    "paidThrough" TIMESTAMP(3),
    "statusOverrideBy" TEXT,
    "statusOverrideNote" TEXT,
    "statusOverrideAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reference" TEXT,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "previousPaidThrough" TIMESTAMP(3),
    "reviewState" "ReviewState" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAudit" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "from" "BillingStatus" NOT NULL,
    "to" "BillingStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL,
    "scope" "AreaScope" NOT NULL,
    "templateId" TEXT,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "nameEs" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "iconKey" TEXT NOT NULL DEFAULT 'sparkle',
    "tint" TEXT NOT NULL DEFAULT '#FFEDD5',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT false,
    "sourceAreaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "subtitleEn" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY',
    "wordCount" INTEGER NOT NULL DEFAULT 6,
    "introParagraph" TEXT NOT NULL DEFAULT '',
    "introParagraphEs" TEXT NOT NULL DEFAULT '',
    "sourceUnitId" TEXT,
    "generationInput" JSONB,
    "generatedAt" TIMESTAMP(3),
    "editedAfterGen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "definitionEs" TEXT NOT NULL,
    "ipa" TEXT NOT NULL,
    "syllables" TEXT NOT NULL DEFAULT '',
    "stress" TEXT NOT NULL DEFAULT '',
    "pos" TEXT NOT NULL DEFAULT '',
    "exampleSentence" TEXT NOT NULL,
    "exampleSentenceEs" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptEs" TEXT NOT NULL,
    "sentence" TEXT,
    "options" JSONB NOT NULL DEFAULT '[]',
    "answerIndex" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT NOT NULL DEFAULT '',
    "noteEs" TEXT NOT NULL DEFAULT '',
    "mono" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitProgress" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "flawless" BOOLEAN NOT NULL DEFAULT false,
    "passedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityAttempt" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpLedger" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "XpReason" NOT NULL,
    "unitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "svgPath" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerBadge" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnerBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "AuthToken_userId_purpose_idx" ON "AuthToken"("userId", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Learner_userId_key" ON "Learner"("userId");

-- CreateIndex
CREATE INDEX "Learner_orgId_idx" ON "Learner"("orgId");

-- CreateIndex
CREATE INDEX "Learner_billingStatus_idx" ON "Learner"("billingStatus");

-- CreateIndex
CREATE INDEX "Payment_learnerId_idx" ON "Payment"("learnerId");

-- CreateIndex
CREATE INDEX "Payment_reviewState_idx" ON "Payment"("reviewState");

-- CreateIndex
CREATE INDEX "Payment_declaredAt_idx" ON "Payment"("declaredAt");

-- CreateIndex
CREATE INDEX "BillingAudit_learnerId_idx" ON "BillingAudit"("learnerId");

-- CreateIndex
CREATE INDEX "Area_orgId_sortOrder_idx" ON "Area"("orgId", "sortOrder");

-- CreateIndex
CREATE INDEX "Area_templateId_sortOrder_idx" ON "Area"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "Unit_areaId_sortOrder_idx" ON "Unit"("areaId", "sortOrder");

-- CreateIndex
CREATE INDEX "Word_unitId_sortOrder_idx" ON "Word"("unitId", "sortOrder");

-- CreateIndex
CREATE INDEX "Activity_unitId_sortOrder_idx" ON "Activity"("unitId", "sortOrder");

-- CreateIndex
CREATE INDEX "UnitProgress_unitId_idx" ON "UnitProgress"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitProgress_learnerId_unitId_key" ON "UnitProgress"("learnerId", "unitId");

-- CreateIndex
CREATE INDEX "ActivityAttempt_learnerId_answeredAt_idx" ON "ActivityAttempt"("learnerId", "answeredAt");

-- CreateIndex
CREATE INDEX "ActivityAttempt_activityId_idx" ON "ActivityAttempt"("activityId");

-- CreateIndex
CREATE INDEX "XpLedger_learnerId_createdAt_idx" ON "XpLedger"("learnerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_key_key" ON "Badge"("key");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerBadge_learnerId_badgeId_key" ON "LearnerBadge"("learnerId", "badgeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAudit" ADD CONSTRAINT "BillingAudit_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GlobalTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitProgress" ADD CONSTRAINT "UnitProgress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitProgress" ADD CONSTRAINT "UnitProgress_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAttempt" ADD CONSTRAINT "ActivityAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityAttempt" ADD CONSTRAINT "ActivityAttempt_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpLedger" ADD CONSTRAINT "XpLedger_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerBadge" ADD CONSTRAINT "LearnerBadge_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerBadge" ADD CONSTRAINT "LearnerBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

