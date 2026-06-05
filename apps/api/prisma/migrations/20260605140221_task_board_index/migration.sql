-- DropIndex
DROP INDEX "Task_projectId_status_idx";

-- CreateIndex
CREATE INDEX "Task_projectId_status_order_idx" ON "Task"("projectId", "status", "order");
