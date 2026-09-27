import { PublicRegistrationForm } from '@/features/members/components/PublicRegistrationForm';
import { LoadingState } from '@/components/common';
import { Suspense } from 'react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:flex sm:items-start sm:justify-center sm:py-10">
      <Suspense fallback={<LoadingState label="Carregando cadastro..." />}><PublicRegistrationForm /></Suspense>
    </div>
  );
}
