import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { hasActionPermission } from '@/lib/access-control';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!hasActionPermission(session.user, 'games', 'view')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
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
