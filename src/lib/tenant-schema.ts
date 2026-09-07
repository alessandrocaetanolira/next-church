import { PrismaClient } from '@prisma/client';

/**
 * Garante compatibilidade com bancos de tenant já existentes que ainda não
 * receberam as colunas e tabelas adicionadas ao schema atual.
 */
export async function ensureTenantSchemaExtensions(prisma: PrismaClient) {
  const memberColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Member")`);
  const memberNames = new Set(memberColumns.map((column) => column.name));

  const memberStatements = [
    ['teamIds', 'TEXT'],
    ['parentPhone', 'TEXT'],
    ['birthDate', 'DATETIME'],
    ['conversionDate', 'DATETIME'],
    ['baptismDate', 'DATETIME'],
    ['previousChurch', 'TEXT'],
    ['aboutMe', 'TEXT'],
    ['maritalStatus', 'TEXT'],
    ['passwordHash', 'TEXT'],
  ] as const;

  for (const [columnName, columnType] of memberStatements) {
    if (!memberNames.has(columnName)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Member" ADD COLUMN "${columnName}" ${columnType}`);
    }
  }

  const productColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Product")`);
  const productNames = new Set(productColumns.map((column) => column.name));

  if (!productNames.has('availableToday')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "availableToday" BOOLEAN DEFAULT 1`);
  }

  if (!productNames.has('imageUrl')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Product" ADD COLUMN "imageUrl" TEXT`);
  }

  const teamColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Team")`);
  const teamNames = new Set(teamColumns.map((column) => column.name));

  if (!teamNames.has('leaderIds')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Team" ADD COLUMN "leaderIds" TEXT`);
  }

  const saleColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Sale")`);
  const saleNames = new Set(saleColumns.map((column) => column.name));

  if (!saleNames.has('orderStatus')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Sale" ADD COLUMN "orderStatus" TEXT`);
  }

  const taskColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Task")`);
  const taskNames = new Set(taskColumns.map((column) => column.name));

  if (!taskNames.has('assignedTo')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Task" ADD COLUMN "assignedTo" TEXT`);
  }

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CreditTransaction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "memberId" TEXT NOT NULL,
      "memberName" TEXT,
      "type" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "saleId" TEXT,
      "notes" TEXT,
      "createdBy" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "CreditTransaction_memberId_createdAt_idx" ON "CreditTransaction"("memberId", "createdAt")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userEmail" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "href" TEXT,
      "sourceType" TEXT,
      "sourceId" TEXT,
      "readAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Notification_userEmail_readAt_createdAt_idx" ON "Notification"("userEmail", "readAt", "createdAt")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Material" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "minQuantity" INTEGER NOT NULL DEFAULT 0,
      "unit" TEXT NOT NULL DEFAULT 'unidades',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Material_category_name_idx" ON "Material"("category", "name")`
  );

  const materialColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("Material")`);
  const materialNames = new Set(materialColumns.map((column) => column.name));

  if (!materialNames.has('teamId')) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Material" ADD COLUMN "teamId" TEXT`);
  }

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Material_teamId_category_name_idx" ON "Material"("teamId", "category", "name")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Group" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "type" TEXT NOT NULL DEFAULT 'team',
      "capabilities" TEXT NOT NULL DEFAULT '[]',
      "color" TEXT NOT NULL DEFAULT 'primary',
      "icon" TEXT NOT NULL DEFAULT 'users',
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Group_type_name_idx" ON "Group"("type", "name")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GroupMember" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "groupId" TEXT NOT NULL,
      "memberId" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'member',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "GroupMember_groupId_memberId_idx" ON "GroupMember"("groupId", "memberId")`
  );

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "GroupMember_memberId_role_idx" ON "GroupMember"("memberId", "role")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FundraisingGoal" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "groupId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "targetAmount" REAL NOT NULL DEFAULT 0,
      "currentAmount" REAL NOT NULL DEFAULT 0,
      "items" TEXT NOT NULL DEFAULT '[]',
      "deadline" DATETIME,
      "active" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "FundraisingGoal_groupId_active_idx" ON "FundraisingGoal"("groupId", "active")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ChildProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "birthDate" DATETIME,
      "parentMemberIds" TEXT NOT NULL DEFAULT '[]',
      "allergies" TEXT,
      "medications" TEXT,
      "healthHistory" TEXT,
      "dietaryRestrictions" TEXT,
      "canDoPhysicalActivities" BOOLEAN NOT NULL DEFAULT 1,
      "notes" TEXT,
      "groupIds" TEXT NOT NULL DEFAULT '[]',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ChildProfile_name_idx" ON "ChildProfile"("name")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ParkingSpot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "groupId" TEXT NOT NULL,
      "label" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'free',
      "occupiedByMemberId" TEXT,
      "occupiedByName" TEXT,
      "notes" TEXT,
      "occupiedAt" DATETIME,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ParkingSpot_groupId_status_label_idx" ON "ParkingSpot"("groupId", "status", "label")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeamJoinRequest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "memberId" TEXT NOT NULL,
      "memberName" TEXT NOT NULL,
      "teamId" TEXT NOT NULL,
      "teamName" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TeamJoinRequest_memberId_teamId_status_idx" ON "TeamJoinRequest"("memberId", "teamId", "status")`
  );

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "TeamJoinRequest_teamId_status_createdAt_idx" ON "TeamJoinRequest"("teamId", "status", "createdAt")`
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EngagementProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userEmail" TEXT NOT NULL UNIQUE,
      "devotionalStreak" INTEGER NOT NULL DEFAULT 0,
      "devotionalLastDate" TEXT,
      "completedChallengeIds" TEXT NOT NULL DEFAULT '[]',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "deletedAt" DATETIME
    )
  `);

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "EngagementProfile_userEmail_idx" ON "EngagementProfile"("userEmail")`
  );

  const feedColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("FeedPost")`);
  const feedNames = new Set(feedColumns.map((column) => column.name));

  const feedStatements = [
    ['senderType', `TEXT DEFAULT 'user'`],
    ['senderGroupId', 'TEXT'],
    ['title', 'TEXT'],
    ['visibility', `TEXT DEFAULT 'public'`],
    ['mediaUrl', 'TEXT'],
    ['mediaType', 'TEXT'],
    ['groupId', 'TEXT'],
    ['pinnedUntil', 'DATETIME'],
    ['targetUserIds', 'TEXT'],
    ['readBy', 'TEXT'],
  ] as const;

  for (const [columnName, columnType] of feedStatements) {
    if (!feedNames.has(columnName)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "FeedPost" ADD COLUMN "${columnName}" ${columnType}`);
    }
  }

  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "FeedPost_visibility_groupId_createdAt_idx" ON "FeedPost"("visibility", "groupId", "createdAt")`
  );
}
