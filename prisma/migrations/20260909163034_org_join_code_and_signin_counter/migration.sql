-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "joinCode" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedSignIns" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFailedSignInAt" TIMESTAMP(3);

-- Backfill: every existing organisation needs a code, or its learners have no
-- way to join. Codes are drawn from a shuffled pool of the whole 1000-9999
-- range rather than generated per row, which is what makes them distinct in a
-- single statement — a per-row random() would collide sooner or later and take
-- the unique index below down with it.
WITH pool AS (
  SELECT LPAD(g::text, 4, '0') AS code,
         row_number() OVER (ORDER BY random()) AS rn
  FROM generate_series(1000, 9999) g
), orgs AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt") AS rn
  FROM "Organization"
  WHERE "joinCode" IS NULL
)
UPDATE "Organization" o
SET "joinCode" = pool.code
FROM orgs, pool
WHERE o.id = orgs.id AND pool.rn = orgs.rn;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_joinCode_key" ON "Organization"("joinCode");
