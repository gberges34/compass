-- CreateIndex
CREATE UNIQUE INDEX "unique_review_per_period" ON "Review"("type", "periodStart");
