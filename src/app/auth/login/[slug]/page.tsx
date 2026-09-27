import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LoadingState } from '@/components/common';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { getGlobalClient } from '@/lib/prisma-factory';
import { BrandingRepository } from '@/server/branding/branding.repository';
import { BrandingService } from '@/server/branding/branding.service';

export const dynamic = 'force-dynamic';

export default async function TenantLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = slug.trim().toLowerCase();
  const repository = new BrandingRepository(getGlobalClient());
  const row = await repository.findPublic(normalizedSlug);

  if (!row || !row.active) notFound();

  const branding = new BrandingService(repository).normalize(row);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={<LoadingState label="Carregando login..." />}>
        <LoginForm initialSlug={normalizedSlug} initialBranding={branding} lockTenant />
      </Suspense>
    </div>
  );
}
