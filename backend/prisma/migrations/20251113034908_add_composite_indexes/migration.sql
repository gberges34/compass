-- CreateIndex
CREATE INDEX "Task_status_priority_scheduledStart_idx" ON "Task"("status", "priority", "scheduledStart");

-- CreateIndex
CREATE INDEX "PostDoLog_completionDate_taskId_idx" ON "PostDoLog"("completionDate", "taskId");
