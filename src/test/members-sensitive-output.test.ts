// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@/generated/prisma-tenant';
import { MembersRepository } from '@/server/members/members.repository';
import { PastoralRepository } from '@/server/pastoral/pastoral.repository';
import { PastoralService } from '@/server/pastoral/pastoral.service';

const runtime = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn() }));
vi.mock('@/auth', () => ({ auth: runtime.auth }));
vi.mock('@/lib/prisma-factory', () => ({ getTenantClient: runtime.client }));
import { GET as listMembers } from '@/app/api/members/route';
import { GET as getMember, PUT as updateMember } from '@/app/api/members/[id]/route';

describe('credenciais de membros permanecem no servidor', () => {
  let directory: string;
  let prisma: PrismaClient;
  let repository: MembersRepository;
  let hash: string;
  const session = { user: { id: 'admin', tenantId: 'test-only', role: 'ADMIN', authValid: true } };

  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'church-member-output-'));
    prisma = new PrismaClient({ datasources: { db: { url: `file:${path.join(directory, 'tenant.db')}` } } });
    // Fixture isolada: nenhum arquivo ou migration de banco da aplicação é usado.
    await prisma.$executeRawUnsafe(`CREATE TABLE "Member" (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
      teamIds TEXT, parentPhone TEXT, creditBalance REAL NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT 1, approved BOOLEAN NOT NULL DEFAULT 0,
      birthDate DATETIME, conversionDate DATETIME, baptismDate DATETIME,
      previousChurch TEXT, aboutMe TEXT, maritalStatus TEXT, passwordHash TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL, deletedAt DATETIME
    )`);
    await prisma.$executeRawUnsafe(`CREATE TABLE "User" (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, avatarUrl TEXT, coverUrl TEXT,
      passwordHash TEXT, role TEXT NOT NULL DEFAULT 'MEMBER', permissions TEXT, linkedMemberId TEXT,
      active BOOLEAN NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME NOT NULL, deletedAt DATETIME
    )`);
    repository = new MembersRepository(prisma);
    hash = await bcrypt.hash('senha-de-teste', 4);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    runtime.auth.mockResolvedValue(session);
    runtime.client.mockReturnValue(prisma);
    await prisma.user.deleteMany();
    await prisma.member.deleteMany();
    await prisma.member.create({ data: {
      id: 'pending', name: "João D'Ávila", email: 'joao@example.test', phone: '11999999999',
      passwordHash: hash, approved: false, creditBalance: 42, teamIds: 'one,two', aboutMe: 'Texto público',
    } });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    if (directory) fs.rmSync(directory, { recursive: true, force: true });
  });

  function expectSafe(value: unknown) {
    expect(JSON.stringify(value)).not.toContain('passwordHash');
    expect(JSON.stringify(value)).not.toContain(hash);
  }

  it('lista e detalhe HTTP omitem o hash sem perder campos funcionais', async () => {
    const list = await listMembers(new Request('http://localhost/api/members'));
    expect(list.status).toBe(200);
    const rows = await list.json();
    expectSafe(rows);
    expect(rows[0]).toMatchObject({ id: 'pending', creditBalance: 42, teamIds: ['one', 'two'], hasAccess: false });

    const detail = await getMember(new Request('http://localhost/api/members/pending'), { params: Promise.resolve({ id: 'pending' }) });
    expect(detail.status).toBe(200);
    expectSafe(await detail.json());
  });

  it('resposta de atualização não expõe nem modifica a credencial interna', async () => {
    const response = await updateMember(new Request('http://localhost/api/members/pending', {
      method: 'PUT', body: JSON.stringify({ name: 'João atualizado', email: 'joao@example.test', phone: '11999999999', approved: false }),
    }), { params: Promise.resolve({ id: 'pending' }) });
    expect(response.status).toBe(200);
    expectSafe(await response.json());
    expect((await prisma.member.findUniqueOrThrow({ where: { id: 'pending' } })).passwordHash).toBe(hash);
  });

  it('criação e perfis públicos não incluem o campo de credencial', async () => {
    const created = await repository.create({ id: 'new', name: 'Novo', email: 'new@example.test', phone: '11999999999', approved: true });
    expectSafe(created);
    expectSafe(await repository.findPublicProfile('new'));
  });

  it('aprovação ainda usa o hash existente e concede somente o acesso padrão', async () => {
    const feed = { publishMemberWelcome: vi.fn().mockResolvedValue(null) };
    await new PastoralService(new PastoralRepository(prisma), feed).approve('pending');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'joao@example.test' } });
    expect(user.passwordHash).toBe(hash);
    expect(await bcrypt.compare('senha-de-teste', user.passwordHash!)).toBe(true);
    expect(user).toMatchObject({ role: 'MEMBER', linkedMemberId: 'pending', active: true });
    expect(feed.publishMemberWelcome).toHaveBeenCalledOnce();
    const rows = await repository.list();
    expectSafe(rows);
    expect(rows[0]).toMatchObject({ hasAccess: true, role: 'MEMBER', creditBalance: 42 });
  });

  it('sessão invalidada não acessa o handler nem abre o banco do tenant', async () => {
    runtime.auth.mockResolvedValue({ user: { ...session.user, authValid: false } });
    const response = await listMembers(new Request('http://localhost/api/members'));
    expect(response.status).toBe(401);
    expect(runtime.client).not.toHaveBeenCalled();
  });
});
