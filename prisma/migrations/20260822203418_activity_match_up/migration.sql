-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'MATCH_UP';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "matchGroup" TEXT;

-- CreateIndex
CREATE INDEX "Activity_matchGroup_idx" ON "Activity"("matchGroup");
