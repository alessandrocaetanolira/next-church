CREATE TABLE "PlatformPushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlatformPushSubscription_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PlatformPushSubscription_endpoint_key" ON "PlatformPushSubscription"("endpoint");
CREATE INDEX "PlatformPushSubscription_adminId_idx" ON "PlatformPushSubscription"("adminId");
CREATE TABLE "PlatformNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "readAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlatformNotification_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PlatformNotification_adminId_createdAt_idx" ON "PlatformNotification"("adminId", "createdAt");
