ALTER TABLE "GameScore" ADD COLUMN "runId" TEXT;
CREATE UNIQUE INDEX "GameScore_runId_key" ON "GameScore"("runId") WHERE "runId" IS NOT NULL;
