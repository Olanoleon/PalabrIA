-- AlterTable
ALTER TABLE "Area" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "AreaGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orgId" TEXT,
    "templateId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AreaGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AreaGroup_orgId_sortOrder_idx" ON "AreaGroup"("orgId", "sortOrder");

-- CreateIndex
CREATE INDEX "AreaGroup_templateId_sortOrder_idx" ON "AreaGroup"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "Area_groupId_idx" ON "Area"("groupId");

-- AddForeignKey
ALTER TABLE "AreaGroup" ADD CONSTRAINT "AreaGroup_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaGroup" ADD CONSTRAINT "AreaGroup_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GlobalTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AreaGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
