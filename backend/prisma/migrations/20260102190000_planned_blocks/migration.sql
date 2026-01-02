-- Ensure UUID generation for backfill
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- AlterTable: add new column first
ALTER TABLE "DailyPlan"
ADD COLUMN     "plannedBlocks" JSONB NOT NULL DEFAULT '[]';

-- Backfill plannedBlocks from legacy columns
UPDATE "DailyPlan"
SET "plannedBlocks" = COALESCE((
  SELECT jsonb_agg(elem)
  FROM (
    SELECT jsonb_build_object(
      'id', gen_random_uuid(),
      'start', "deepWorkBlock1"->>'start',
      'end', "deepWorkBlock1"->>'end',
      'label', "deepWorkBlock1"->>'focus'
    ) WHERE "deepWorkBlock1" IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object(
      'id', gen_random_uuid(),
      'start', "deepWorkBlock2"->>'start',
      'end', "deepWorkBlock2"->>'end',
      'label', "deepWorkBlock2"->>'focus'
    ) WHERE "deepWorkBlock2" IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object(
      'id', gen_random_uuid(),
      'start', "adminBlock"->>'start',
      'end', "adminBlock"->>'end',
      'label', 'Admin'
    ) WHERE "adminBlock" IS NOT NULL
    UNION ALL
    SELECT jsonb_build_object(
      'id', gen_random_uuid(),
      'start', "bufferBlock"->>'start',
      'end', "bufferBlock"->>'end',
      'label', 'Buffer'
    ) WHERE "bufferBlock" IS NOT NULL
  ) AS elems(elem)
), '[]')
WHERE "deepWorkBlock1" IS NOT NULL
   OR "deepWorkBlock2" IS NOT NULL
   OR "adminBlock" IS NOT NULL
   OR "bufferBlock" IS NOT NULL;

-- Drop legacy columns after backfill
ALTER TABLE "DailyPlan"
DROP COLUMN "deepWorkBlock1",
DROP COLUMN "deepWorkBlock2",
DROP COLUMN "adminBlock",
DROP COLUMN "bufferBlock";
