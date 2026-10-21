import { TenantLoginScreen } from '@/features/auth/components/TenantLoginScreen';

export const dynamic = 'force-dynamic';

export default async function TenantLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TenantLoginScreen slug={slug} />;
}
