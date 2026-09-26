import { PublicRegistrationForm } from '@/features/members/components/PublicRegistrationForm';
import { LoadingState } from '@/components/common';
import { Suspense } from 'react';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<LoadingState label="Carregando cadastro..." />}><PublicRegistrationForm /></Suspense>
    </div>
  );
}
