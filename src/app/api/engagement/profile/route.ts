import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { generateId } from '@/lib/id';
import { getChallengePointsForIds } from '@/lib/devotional';
import { hasPlanFeature } from '@/lib/access-control';

function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function yesterdayKey() {
  return dayKey(new Date(Date.now() - 86400000));
}

function parseCompletedIds(value: string | null | undefined) {
  if (!value) return [] as number[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : [];
  } catch {
    return [];
  }
}

function buildRanking(attempts: Array<{ userId: string; score: number }>) {
  const totals = new Map<string, number>();

  attempts.forEach((attempt) => {
    totals.set(attempt.userId, (totals.get(attempt.userId) ?? 0) + attempt.score);
  });

  return Array.from(totals.entries())
    .map(([userId, totalScore]) => ({ userId, totalScore }))
    .sort((a, b) => b.totalScore - a.totalScore);
}

async function getOrCreateProfile(tenantId: string, userEmail: string) {
  const prisma = getTenantClient(tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const [existing] = await prisma.$queryRawUnsafe<Array<{
    id: string;
    userEmail: string;
    devotionalStreak: number;
    devotionalLastDate: string | null;
    completedChallengeIds: string;
  }>>(
    `
      SELECT id, userEmail, devotionalStreak, devotionalLastDate, completedChallengeIds
      FROM "EngagementProfile"
      WHERE userEmail = ? AND deletedAt IS NULL
      LIMIT 1
    `,
    userEmail
  );

  if (existing) {
    return { prisma, profile: existing };
  }

  const id = generateId();
  const now = new Date().toISOString();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "EngagementProfile" (id, userEmail, devotionalStreak, devotionalLastDate, completedChallengeIds, createdAt, updatedAt, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    id,
    userEmail,
    0,
    null,
    '[]',
    now,
    now,
    null
  );

  return {
    prisma,
    profile: {
      id,
      userEmail,
      devotionalStreak: 0,
      devotionalLastDate: null,
      completedChallengeIds: '[]',
    },
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasPlanFeature(session.user, 'engagement')) return NextResponse.json({ error: 'Recurso não disponível no plano' }, { status: 403 });

  const { prisma, profile } = await getOrCreateProfile(session.user.tenantId, session.user.email);
  const completedChallengeIds = parseCompletedIds(profile.completedChallengeIds);
  const devotionalPoints = getChallengePointsForIds(completedChallengeIds);
  const attempts = await prisma.quizAttempt.findMany({
    where: { deletedAt: null },
    select: { userId: true, score: true },
  });
  const gamePoints = attempts
    .filter((attempt) => attempt.userId === session.user.email)
    .reduce((total, attempt) => total + attempt.score, 0);
  const ranking = buildRanking(attempts);
  const rankIndex = ranking.findIndex((item) => item.userId === session.user.email);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;
  const devotionalReadToday = profile.devotionalLastDate === dayKey();

  return NextResponse.json({
    devotionalStreak: profile.devotionalStreak,
    devotionalLastDate: profile.devotionalLastDate,
    devotionalReadToday,
    completedChallengeIds,
    devotionalPoints,
    gamePoints,
    points: devotionalPoints + gamePoints,
    rank,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasPlanFeature(session.user, 'engagement')) return NextResponse.json({ error: 'Recurso não disponível no plano' }, { status: 403 });

  const { action, devotionalId } = await request.json();
  const { prisma, profile } = await getOrCreateProfile(session.user.tenantId, session.user.email);

  let devotionalStreak = profile.devotionalStreak;
  let devotionalLastDate = profile.devotionalLastDate;
  let completedChallengeIds = parseCompletedIds(profile.completedChallengeIds);
  const today = dayKey();

  if (action === 'markDevotionalRead') {
    if (devotionalLastDate !== today) {
      devotionalStreak = devotionalLastDate === yesterdayKey() ? devotionalStreak + 1 : 1;
      devotionalLastDate = today;
    }
  } else if (action === 'completeChallenge') {
    if (typeof devotionalId !== 'number') {
      return NextResponse.json({ error: 'Desafio inválido.' }, { status: 400 });
    }

    if (!completedChallengeIds.includes(devotionalId)) {
      completedChallengeIds = [...completedChallengeIds, devotionalId];
    }
  } else {
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE "EngagementProfile"
      SET devotionalStreak = ?, devotionalLastDate = ?, completedChallengeIds = ?, updatedAt = ?
      WHERE id = ?
    `,
    devotionalStreak,
    devotionalLastDate,
    JSON.stringify(completedChallengeIds),
    new Date().toISOString(),
    profile.id
  );

  const devotionalPoints = getChallengePointsForIds(completedChallengeIds);
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      deletedAt: null,
    },
    select: { userId: true, score: true },
  });
  const gamePoints = attempts
    .filter((attempt) => attempt.userId === session.user.email)
    .reduce((total, attempt) => total + attempt.score, 0);
  const ranking = buildRanking(attempts);
  const rankIndex = ranking.findIndex((item) => item.userId === session.user.email);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  return NextResponse.json({
    devotionalStreak,
    devotionalLastDate,
    devotionalReadToday: devotionalLastDate === today,
    completedChallengeIds,
    devotionalPoints,
    gamePoints,
    points: devotionalPoints + gamePoints,
    rank,
  });
}
