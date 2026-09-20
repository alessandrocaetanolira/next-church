import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGlobalClient } from '@/lib/prisma-factory';

async function requirePlatformAdmin() {
  const session = await auth();
  return session?.user?.isPlatformAdmin ? getGlobalClient() : null;
}

function normalizeCode(value: unknown) {
  return typeof value === 'string'
    ? value.trim().toUpperCase().replace(/[^A-Z0-9_-]+/g, '_')
    : '';
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

async function withUsage(prisma: ReturnType<typeof getGlobalClient>, plan: { code: string }) {
  const churches = await prisma.church.count({ where: { plan: plan.code } });
  return { ...plan, churches };
}

export async function GET() {
  const prisma = await requirePlatformAdmin();
  if (!prisma) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const plans = await prisma.plan.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
  return NextResponse.json(await Promise.all(plans.map((plan) => withUsage(prisma, plan))));
}

export async function POST(request: NextRequest) {
  const prisma = await requirePlatformAdmin();
  if (!prisma) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json();
  const code = normalizeCode(body.code);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const priceCents = Number(body.priceCents ?? 0);
  if (!code || !name || !Number.isInteger(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: 'Código, nome e preço válido são obrigatórios.' }, { status: 400 });
  }

  try {
    const plan = await prisma.plan.create({
      data: {
        code,
        name,
        description: typeof body.description === 'string' ? body.description.trim() || null : null,
        priceCents,
        maxUsers: parseNullableInt(body.maxUsers),
        maxStorageMb: parseNullableInt(body.maxStorageMb),
        features: JSON.stringify(parseFeatures(body.features)),
        active: body.active !== false,
      },
    });
    return NextResponse.json(await withUsage(prisma, plan), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Código de plano já cadastrado.' }, { status: 409 });
  }
}
