-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('LEARNER_PAID', 'ORG_PAID');

-- AlterTable
-- Every existing organisation keeps the behaviour it has today: its learners
-- declare their own payments. Switching one to ORG_PAID is a deliberate act in
-- the Super Admin console.
ALTER TABLE "Organization" ADD COLUMN     "billingMode" "BillingMode" NOT NULL DEFAULT 'LEARNER_PAID';
