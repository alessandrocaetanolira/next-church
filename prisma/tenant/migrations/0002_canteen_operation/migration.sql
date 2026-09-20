CREATE TABLE "CanteenSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" DATETIME,
    "closedAt" DATETIME,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "CanteenSettings" ("id", "isOpen", "createdAt", "updatedAt")
VALUES ('default', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
