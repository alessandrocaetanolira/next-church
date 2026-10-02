import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { LoadingState } from '@/components/common';

export default function PlatformAdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Suspense fallback={<LoadingState label="Carregando login..." />}>
        <LoginForm globalOnly />
      </Suspense>
    </div>
  );
}
