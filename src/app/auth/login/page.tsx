/**
 * app/auth/login/page.tsx
 * 
 * Página de Login (Next.js App Router).
 * Centraliza o LoginForm para autenticação multi-tenant.
 */

import { LoginForm } from "@/features/auth/components/LoginForm";

/**
 * LoginPage
 * 
 * Define o layout e renderiza o componente de formulário de login.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <LoginForm />
    </div>
  );
}
