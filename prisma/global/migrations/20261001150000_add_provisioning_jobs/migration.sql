CREATE TABLE "ProvisioningJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "runId" TEXT NOT NULL,
  "churchId" TEXT,
  "slug" TEXT NOT NULL,
  "adminEmail" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "step" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" DATETIME,
  "finishedAt" DATETIME,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProvisioningJob_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ProvisioningJob_runId_key" ON "ProvisioningJob"("runId");
CREATE INDEX "ProvisioningJob_churchId_idx" ON "ProvisioningJob"("churchId");
CREATE INDEX "ProvisioningJob_status_idx" ON "ProvisioningJob"("status");
