-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "regeneratingSince" TIMESTAMP(3),
ADD COLUMN     "regenerationError" TEXT;
