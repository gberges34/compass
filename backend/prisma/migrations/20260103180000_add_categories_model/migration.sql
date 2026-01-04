-- Ensure UUID generation is available if/when needed.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rename legacy enum type used by Task.category so Prisma can use enum TaskCategory.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Category') THEN
    EXECUTE 'ALTER TYPE "Category" RENAME TO "TaskCategory"';
  END IF;
END
$$;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "togglProjectId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_nameKey_key" ON "Category"("nameKey");

-- Seed system categories used throughout the app.
INSERT INTO "Category" ("id", "name", "nameKey", "color", "icon", "isSystem", "isLocked", "sortOrder", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::TEXT, 'Work', 'work', 'sky', '💼', true, false, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Personal', 'personal', 'mint', '🧩', true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'School', 'school', 'lavender', '📚', true, false, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Fitness', 'fitness', 'lime', '🏋️', true, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Music', 'music', 'orchid', '🎵', true, false, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Sleep', 'sleep', 'ice', '🛌', true, true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::TEXT, 'Other', 'other', 'butter', '📁', true, true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nameKey") DO NOTHING;
