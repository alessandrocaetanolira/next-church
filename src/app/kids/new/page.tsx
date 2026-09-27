'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebPageLayout } from '@/components/shared/web';
import { KidsForm } from '@/features/kids/components/KidsForm';
import { listKidsOptions, type KidsGroupOption, type KidsMemberOption } from '@/services/kids/kids-api';

export default function NewKidPage() {
  const router = useRouter();
  const [members, setMembers] = useState<KidsMemberOption[]>([]);
  const [groups, setGroups] = useState<KidsGroupOption[]>([]);
  useEffect(() => { void listKidsOptions().then(([, memberData, groupData]) => { setMembers(memberData); setGroups(groupData); }); }, []);
  return <WebPageLayout title="Nova criança" description="Cadastre as informações e cuidados da criança."><Button variant="ghost" onClick={() => router.push('/kids')}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Infantil</Button><KidsForm members={members} groups={groups} onSaved={() => router.push('/kids')} /></WebPageLayout>;
}
