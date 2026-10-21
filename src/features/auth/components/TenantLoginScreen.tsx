import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { LoadingState } from '@/components/common';
import { getGlobalClient } from '@/lib/prisma-factory';
import { BrandingRepository } from '@/server/branding/branding.repository';
import { BrandingService } from '@/server/branding/branding.service';
import { LoginForm } from './LoginForm';

export async function TenantLoginScreen({ slug }: { slug: string }) {
  const normalizedSlug = slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) notFound();
  const repository = new BrandingRepository(getGlobalClient());
  const row = await repository.findPublic(normalizedSlug);
  if (!row || !row.active || row.status !== 'ACTIVE') notFound();
  const branding = new BrandingService(repository).normalize(row);

  return <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <Suspense fallback={<LoadingState label="Carregando login..." />}>
      <LoginForm initialSlug={normalizedSlug} initialBranding={branding} lockTenant />
    </Suspense>
  </div>;
}
