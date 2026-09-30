ALTER TABLE "GameChallenge" ADD COLUMN "memoryBoard" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "GameChallenge" ADD COLUMN "memoryMatched" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "GameChallenge" ADD COLUMN "memoryFirstIndex" INTEGER;
ALTER TABLE "GameChallenge" ADD COLUMN "memorySecondIndex" INTEGER;
