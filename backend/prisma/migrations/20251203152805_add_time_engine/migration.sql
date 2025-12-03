-- CreateEnum
CREATE TYPE "TimeDimension" AS ENUM ('PRIMARY', 'WORK_MODE', 'SOCIAL', 'SEGMENT');

-- CreateEnum
CREATE TYPE "TimeSource" AS ENUM ('SHORTCUT', 'TIMERY', 'MANUAL', 'API');

-- CreateTable
CREATE TABLE "TimeSlice" (
    "id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3),
    "category" TEXT NOT NULL,
    "dimension" "TimeDimension" NOT NULL,
    "source" "TimeSource" NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "linkedTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeSlice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TimeSlice_start_end_idx" ON "TimeSlice"("start", "end");

-- CreateIndex
CREATE INDEX "TimeSlice_dimension_end_idx" ON "TimeSlice"("dimension", "end");


