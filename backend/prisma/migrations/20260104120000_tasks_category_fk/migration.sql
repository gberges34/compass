-- Ensure UUID generation is available if/when needed.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure legacy TaskCategory enum-backed categories exist in the new Category table for backfill.
INSERT INTO "Category" ("id", "name", "nameKey", "color", "icon", "isSystem", "isLocked", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::TEXT, 'Gaming', 'gaming', 'petal', '🎮', true, false, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Nutrition', 'nutrition', 'apricot', '🥗', true, false, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Hygiene', 'hygiene', 'ice', '🧼', true, false, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Pet', 'pet', 'peach', '🐾', true, false, 13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Social', 'social', 'sky', '🫂', true, false, 14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Admin', 'admin', 'butter', '🧾', true, false, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nameKey") DO NOTHING;

-- Add categoryId to tasks (nullable for backfill).
ALTER TABLE "Task"
ADD COLUMN IF NOT EXISTS "categoryId" TEXT;

-- Backfill categoryId based on prior enum value (Task.category) -> lower(nameKey).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Task' AND column_name = 'category'
  ) THEN
    UPDATE "Task" AS t
    SET "categoryId" = c.id
    FROM "Category" AS c
    WHERE c."nameKey" = lower(t."category"::text)
      AND t."categoryId" IS NULL;
  END IF;
END
$$;

-- Final safety net: if any tasks are still unmapped, assign them to "Other".
UPDATE "Task"
SET "categoryId" = (
  SELECT id FROM "Category" WHERE "nameKey" = 'other' LIMIT 1
)
WHERE "categoryId" IS NULL;

-- Make the column required.
ALTER TABLE "Task"
ALTER COLUMN "categoryId" SET NOT NULL;

-- Add FK + index.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Task_categoryId_fkey'
  ) THEN
    ALTER TABLE "Task"
    ADD CONSTRAINT "Task_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "Task_categoryId_idx" ON "Task"("categoryId");

-- Drop legacy enum column if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Task' AND column_name = 'category'
  ) THEN
    ALTER TABLE "Task" DROP COLUMN "category";
  END IF;
END
$$;

-- Drop legacy enum type if it exists and is no longer used.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskCategory') THEN
    DROP TYPE "TaskCategory";
  END IF;
END
$$;

