-- CreateTable
CREATE TABLE "DailyHealthMetric" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "steps" INTEGER,
    "activeCalories" INTEGER,
    "exerciseMinutes" INTEGER,
    "standHours" INTEGER,
    "sleepDuration" INTEGER,
    "sleepQuality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyHealthMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyHealthMetric_date_key" ON "DailyHealthMetric"("date");

-- CreateIndex
CREATE INDEX "DailyHealthMetric_date_idx" ON "DailyHealthMetric"("date");

