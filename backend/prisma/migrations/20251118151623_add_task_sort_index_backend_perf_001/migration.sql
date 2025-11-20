-- CreateIndex
-- Optimize default task list sort order with createdAt tiebreaker (BACKEND-PERF-001)
CREATE INDEX "Task_status_priority_scheduledStart_createdAt_idx" ON "Task"("status", "priority", "scheduledStart", "createdAt");

