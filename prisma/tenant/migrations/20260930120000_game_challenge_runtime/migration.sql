ALTER TABLE "GameChallenge" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "GameChallenge" ADD COLUMN "lastMoveAt" DATETIME;
ALTER TABLE "GameChallenge" ADD COLUMN "currentTurnEmail" TEXT;
ALTER TABLE "GameChallenge" ADD COLUMN "stateVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameChallenge" ADD COLUMN "moveSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameChallenge" ADD COLUMN "currentQuestion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "GameChallenge" ADD COLUMN "questionOrder" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "GameChallenge" ADD COLUMN "scores" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "GameChallenge" ADD COLUMN "winnerEmail" TEXT;

CREATE TABLE "GameChallengeMove" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "challengeId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "playerEmail" TEXT NOT NULL,
  "questionIndex" INTEGER NOT NULL,
  "answerIndex" INTEGER NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "points" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameChallengeMove_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "GameChallenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "GameChallengeMove_challengeId_sequence_key" ON "GameChallengeMove"("challengeId", "sequence");
CREATE INDEX "GameChallengeMove_challengeId_playerEmail_idx" ON "GameChallengeMove"("challengeId", "playerEmail");
