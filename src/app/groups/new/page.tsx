'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebPageLayout } from '@/components/shared/web';
import { GroupForm } from '@/features/groups/components/GroupForm';

export default function NewGroupPage() {
  const router = useRouter();
  return <WebPageLayout title="Novo grupo" description="Cadastre o grupo e seus participantes."><Button variant="ghost" onClick={() => router.push('/groups')}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para grupos</Button><GroupForm onSaved={() => router.push('/groups')} /></WebPageLayout>;
}
