'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WebPageLayout } from '@/components/shared/web';
import { KidsForm } from '@/features/kids/components/KidsForm';
import { listKidsOptions, type KidsChild, type KidsGroupOption, type KidsMemberOption } from '@/services/kids/kids-api';

export default function EditKidPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [child, setChild] = useState<KidsChild | null>(null);
  const [members, setMembers] = useState<KidsMemberOption[]>([]);
  const [groups, setGroups] = useState<KidsGroupOption[]>([]);
  useEffect(() => { void listKidsOptions().then(([children, memberData, groupData]) => { setChild(children.find((item) => item.id === id) ?? null); setMembers(memberData); setGroups(groupData); }); }, [id]);
  return <WebPageLayout title="Editar criança" description="Atualize o cadastro infantil."><Button variant="ghost" onClick={() => router.push('/kids')}><ArrowLeft className="mr-2 h-4 w-4" />Voltar para Infantil</Button>{child ? <KidsForm child={child} members={members} groups={groups} onSaved={() => router.push('/kids')} /> : <p className="text-sm text-muted-foreground">Carregando cadastro...</p>}</WebPageLayout>;
}
