import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { TenantService } from '@/lib/tenant-service';

export async function GET() {
  const session = await auth();
  if (!session?.user?.isPlatformAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tenants = await TenantService.listTenants();
  const byStatus = tenants.reduce<Record<string, number>>((accumulator, tenant) => {
    accumulator[tenant.status] = (accumulator[tenant.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return NextResponse.json({
    total: tenants.length,
    active: tenants.filter((tenant) => tenant.active && tenant.status === 'ACTIVE').length,
    inactive: tenants.filter((tenant) => !tenant.active).length,
    provisioning: byStatus.PROVISIONING ?? 0,
    failed: byStatus.FAILED ?? 0,
    archived: byStatus.ARCHIVED ?? 0,
  });
}
