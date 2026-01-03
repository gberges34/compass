-- Remove deprecated Reward fields (hard delete)

ALTER TABLE "DailyPlan" DROP COLUMN IF EXISTS "reward";
ALTER TABLE "PostDoLog" DROP COLUMN IF EXISTS "rewardTaken";

