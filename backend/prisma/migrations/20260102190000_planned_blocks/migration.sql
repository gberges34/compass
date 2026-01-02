-- AlterTable
ALTER TABLE "DailyPlan"
ADD COLUMN     "plannedBlocks" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "DailyPlan"
DROP COLUMN "deepWorkBlock1",
DROP COLUMN "deepWorkBlock2",
DROP COLUMN "adminBlock",
DROP COLUMN "bufferBlock";
