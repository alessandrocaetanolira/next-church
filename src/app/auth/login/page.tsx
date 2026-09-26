/**
 * app/auth/login/page.tsx
 * 
 * Página de Login (Next.js App Router).
 * Centraliza o LoginForm para autenticação multi-tenant.
 */

import { LoginForm } from "@/features/auth/components/LoginForm";
import { LoadingState } from '@/components/common';
import { Suspense } from 'react';

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
