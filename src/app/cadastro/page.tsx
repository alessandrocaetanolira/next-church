import { PublicRegistrationForm } from '@/features/members/components/PublicRegistrationForm';
import { Suspense } from 'react';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando cadastro...</div>}><PublicRegistrationForm /></Suspense>
    </div>
  );
}
