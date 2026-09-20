import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGlobalClient } from '@/lib/prisma-factory';

async function requirePlatformAdmin() {
  const session = await auth();
  return session?.user?.isPlatformAdmin ? getGlobalClient() : null;
}

function parseNullableInt(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseFeatures(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((feature): feature is string => typeof feature === 'string').map((feature) => feature.trim()).filter(Boolean)));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = await requirePlatformAdmin();
  if (!prisma) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === 'string') data.description = body.description.trim() || null;
  if (body.priceCents !== undefined) data.priceCents = Number(body.priceCents);
  if (body.maxUsers !== undefined) data.maxUsers = parseNullableInt(body.maxUsers);
  if (body.maxStorageMb !== undefined) data.maxStorageMb = parseNullableInt(body.maxStorageMb);
  if (body.features !== undefined) data.features = JSON.stringify(parseFeatures(body.features));
  if (typeof body.active === 'boolean') data.active = body.active;

  if (typeof data.priceCents === 'number' && (!Number.isInteger(data.priceCents) || data.priceCents < 0)) {
    return NextResponse.json({ error: 'Preço inválido.' }, { status: 400 });
  }

  try {
    const plan = await prisma.plan.update({ where: { id }, data });
    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = await requirePlatformAdmin();
  if (!prisma) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });

  const churches = await prisma.church.count({ where: { plan: plan.code } });
  if (churches > 0) {
    return NextResponse.json({ error: 'Plano em uso. Desative-o ou migre as igrejas antes de excluir.' }, { status: 409 });
  }

  await prisma.plan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
