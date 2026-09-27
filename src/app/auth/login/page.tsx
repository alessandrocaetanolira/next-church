/**
 * app/auth/login/page.tsx
 * 
 * Página de Login (Next.js App Router).
 * Login universal: tenant com slug ou administrador global sem slug.
 */

import type { Metadata } from 'next';
import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoadingState } from '@/components/common';
import { Suspense } from 'react';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ igreja?: string }> }): Promise<Metadata> {
  const { igreja } = await searchParams;
  const slug = typeof igreja === 'string' ? igreja.trim().toLowerCase() : '';
  return slug ? { manifest: `/api/public/manifest?igreja=${encodeURIComponent(slug)}` } : {};
}

/**
 * LoginPage
 * 
 * Define o layout e renderiza o componente de formulário de login.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={<LoadingState label="Carregando login..." />}><LoginForm /></Suspense>
    </div>
  );
}
