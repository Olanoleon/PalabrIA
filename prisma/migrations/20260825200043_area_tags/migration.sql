-- Renaming "AreaGroup" to "AreaTag", because the console calls it a tag and the
-- schema should not disagree with the screen.
--
-- Written by hand. Prisma generated DROP TABLE + CREATE TABLE for this, which
-- would have been harmless today — the table is empty everywhere — and would
-- have silently erased the tags of anyone who had started using it. A rename
-- carries the rows across, so the safety does not depend on the table being
-- empty when it happens to run.

-- AlterTable
ALTER TABLE "AreaGroup" RENAME TO "AreaTag";
ALTER TABLE "Area" RENAME COLUMN "groupId" TO "tagId";

-- Constraints and indexes carry the old name, so rename those too rather than
-- leaving a table whose keys are named after something that no longer exists.
ALTER TABLE "AreaTag" RENAME CONSTRAINT "AreaGroup_pkey" TO "AreaTag_pkey";
ALTER TABLE "AreaTag" RENAME CONSTRAINT "AreaGroup_orgId_fkey" TO "AreaTag_orgId_fkey";
ALTER TABLE "AreaTag" RENAME CONSTRAINT "AreaGroup_templateId_fkey" TO "AreaTag_templateId_fkey";
ALTER TABLE "Area" RENAME CONSTRAINT "Area_groupId_fkey" TO "Area_tagId_fkey";

ALTER INDEX "AreaGroup_orgId_sortOrder_idx" RENAME TO "AreaTag_orgId_sortOrder_idx";
ALTER INDEX "AreaGroup_templateId_sortOrder_idx" RENAME TO "AreaTag_templateId_sortOrder_idx";
ALTER INDEX "Area_groupId_idx" RENAME TO "Area_tagId_idx";
