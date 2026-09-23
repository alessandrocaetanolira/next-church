import { BrandingService } from './branding.service';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGlobalClient } from '@/lib/prisma-factory';
import { hasActionPermission } from '@/lib/access-control';
import { BrandingRepository } from './branding.repository';

export function getBranding(service: BrandingService, row: Record<string, any>) { return service.normalize(row); }
export async function updateBranding(service: BrandingService, row: Record<string, any>, tenantSlug: string, input: unknown) {
  const updated = await service.update(row, tenantSlug, input);
  return service.normalize(updated!);
}

export async function handleSettingsGet() {
  try {
    const session = await auth();
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!hasActionPermission(session.user, 'settings', 'view')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    const repository = new BrandingRepository(getGlobalClient());
    const row = await repository.findByTenant(session.user.tenantId, session.user.tenantSlug);
    if (!row) return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 });
    return NextResponse.json(getBranding(new BrandingService(repository), row));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500 }); }
}

export async function handleSettingsPatch(request: NextRequest) {
  try {
    const session = await auth();
    const role = session?.user?.role?.toUpperCase();
    if (!session?.user?.tenantId || !['ADMIN', 'PASTOR'].includes(role ?? '')) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    if (!hasActionPermission(session.user, 'settings', 'update')) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    const repository = new BrandingRepository(getGlobalClient());
    const service = new BrandingService(repository);
    const row = await repository.findByTenant(session.user.tenantId, session.user.tenantSlug);
    if (!row) return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 });
    return NextResponse.json(await updateBranding(service, row, session.user.tenantSlug ?? row.slug, await request.json()));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível salvar a identidade visual.' }, { status: 400 }); }
}

export async function handlePublicBranding(slug: string | null) {
  if (!slug) return NextResponse.json({ error: 'Igreja não informada.' }, { status: 400 });
  const repository = new BrandingRepository(getGlobalClient());
  const row = await repository.findPublic(slug);
  if (!row || !row.active) return NextResponse.json({ error: 'Igreja não encontrada.' }, { status: 404 });
  return NextResponse.json(new BrandingService(repository).normalize(row));
}
