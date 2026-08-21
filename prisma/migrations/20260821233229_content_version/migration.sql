-- AlterEnum
ALTER TYPE "XpReason" ADD VALUE 'CONTENT_REFRESH';

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "contentVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "UnitProgress" ADD COLUMN     "seenContentVersion" INTEGER NOT NULL DEFAULT 1;
