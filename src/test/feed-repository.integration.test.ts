import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { FeedRepository } from '@/server/feed/feed.repository';

describe('persistência real do Feed', () => {
  let directory: string;
  let prisma: TenantPrismaClient;
  let repository: FeedRepository;

  beforeAll(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-feed-'));
    const databaseUrl = `file:${path.join(directory, 'church_test.db')}`;
    execSync(`DATABASE_URL="${databaseUrl}" npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`, { stdio: 'pipe' });
    prisma = new TenantPrismaClient({ datasources: { db: { url: databaseUrl } } });
    repository = new FeedRepository(prisma);
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('publica uma postagem com os arrays JSON iniciais completos', async () => {
    const post = await repository.create({
      id: 'feed-post-integration',
      userId: 'member@test.local',
      userName: 'Membro Teste',
      userAvatar: null,
      senderType: 'user',
      senderGroupId: null,
      type: 'testimony',
      title: 'Teste',
      content: 'Publicação de teste',
      reference: null,
      mediaUrl: null,
      mediaType: null,
      visibility: 'public',
      groupId: null,
      pinnedUntil: null,
      targetUserIds: [],
    });

    expect(post).toMatchObject({
      id: 'feed-post-integration',
      content: 'Publicação de teste',
      likes: '[]',
      comments: '[]',
      readBy: '[]',
    });
  });
});
