/**
 * app/auth/login/page.tsx
 * 
 * Página de Login (Next.js App Router).
 * Login da igreja identificada pelo link de acesso.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TenantLoginScreen } from '@/features/auth/components/TenantLoginScreen';
import { getPublicTenantMetadata } from '@/lib/branding/public-metadata';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ igreja?: string | string[] }> }): Promise<Metadata> {
  const { igreja } = await searchParams;
  return (await getPublicTenantMetadata(typeof igreja === 'string' ? igreja : '')) ?? {};
}

/**
 * LoginPage
 * 
 * Define o layout e renderiza o componente de formulário de login.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ igreja?: string | string[] }> }) {
  const { igreja } = await searchParams;
  if (typeof igreja !== 'string' || !igreja.trim()) notFound();
  return <TenantLoginScreen slug={igreja} />;
}
