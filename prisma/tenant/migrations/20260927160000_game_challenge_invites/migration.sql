CREATE TABLE "GameChallenge" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "gameType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "challengerUserEmail" TEXT NOT NULL,
  "challengerName" TEXT NOT NULL,
  "opponentUserEmail" TEXT NOT NULL,
  "opponentName" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "acceptedAt" DATETIME,
  "completedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME
);

CREATE INDEX "GameChallenge_challengerUserEmail_status_idx" ON "GameChallenge"("challengerUserEmail", "status");
CREATE INDEX "GameChallenge_opponentUserEmail_status_idx" ON "GameChallenge"("opponentUserEmail", "status");
CREATE INDEX "GameChallenge_expiresAt_idx" ON "GameChallenge"("expiresAt");
