import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { hasPermission } from '@/lib/access-control';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId || !hasPermission(session.user, 'tasks')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);

  try {
    const tasks = await prisma.task.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tarefas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId || !hasPermission(session.user, 'tasks')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const data = await request.json();
  const tenantId = session.user.tenantId;
  const prisma = getTenantClient(tenantId);

  try {
    const task = await prisma.task.create({
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: 'Erro ao criar tarefa' }, { status: 500 });
  }
}
