import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  try {
    const questions = await prisma.quizQuestion.findMany();
    return NextResponse.json(questions);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar quiz' }, { status: 500 });
  }
}
