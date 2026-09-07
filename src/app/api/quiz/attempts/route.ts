import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { generateId } from '@/lib/id';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const attempts = await prisma.quizAttempt.findMany({
    where: { deletedAt: null },
    orderBy: { completedAt: 'desc' },
  });

  return NextResponse.json(
    attempts.map((attempt) => ({
      ...attempt,
      completedAt: attempt.completedAt.toISOString(),
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
      deletedAt: attempt.deletedAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !session.user.email) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { score, totalQuestions, correctAnswers, completedAt, userId, userName } = await request.json();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);

  const attempt = await prisma.quizAttempt.create({
    data: {
      id: generateId(),
      userId: typeof userId === 'string' && userId ? userId : session.user.email,
      userName: typeof userName === 'string' && userName ? userName : session.user.name || 'Jogador',
      score: Number(score) || 0,
      totalQuestions: Number(totalQuestions) || 0,
      correctAnswers: Number(correctAnswers) || 0,
      completedAt: completedAt ? new Date(completedAt) : new Date(),
    },
  });

  return NextResponse.json({
    ...attempt,
    completedAt: attempt.completedAt.toISOString(),
    createdAt: attempt.createdAt.toISOString(),
    updatedAt: attempt.updatedAt.toISOString(),
    deletedAt: attempt.deletedAt?.toISOString() ?? null,
  }, { status: 201 });
}
