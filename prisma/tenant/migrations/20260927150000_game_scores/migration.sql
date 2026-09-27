CREATE TABLE "GameScore" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "userName" TEXT NOT NULL,
  "gameId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  "deletedAt" DATETIME
);

CREATE INDEX "GameScore_userId_idx" ON "GameScore"("userId");
CREATE INDEX "GameScore_gameId_idx" ON "GameScore"("gameId");
CREATE INDEX "GameScore_completedAt_idx" ON "GameScore"("completedAt");
