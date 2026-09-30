'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GameRenderer } from '@/features/new-games/GameRenderer';
import { MemoryOnline } from './MemoryOnline';
import { createQuizChallengeInvite, listQuizChallengeInvitees, type QuizChallengeInvitee } from '@/services/game-challenges/game-challenges-api';
import { toast } from 'sonner';
import { MemoryCpu } from './MemoryCpu';

export function MemoryGameEntry() {
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [invitees, setInvitees] = useState<QuizChallengeInvitee[]>([]);
  const [selected, setSelected] = useState('');
  const [cpu, setCpu] = useState(false);

  useEffect(() => setChallengeId(new URLSearchParams(window.location.search).get('challenge')), []);
  useEffect(() => { if (!challengeId) void listQuizChallengeInvitees().then(setInvitees).catch(() => undefined); }, [challengeId]);
  if (challengeId) return <MemoryOnline />;
  if (cpu) return <MemoryCpu />;
  return <div className="space-y-3">{invitees.length > 0 ? <div className="mx-auto flex max-w-lg items-center gap-2 px-4 pt-3"><select value={selected} onChange={(event) => setSelected(event.target.value)} className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm"><option value="">Desafiar alguém...</option>{invitees.map((invitee) => <option key={invitee.email} value={invitee.email}>{invitee.name}</option>)}</select><Button size="sm" disabled={!selected} onClick={() => void createQuizChallengeInvite(selected, 'memory').then(() => { toast.success('Convite enviado.'); setSelected(''); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Falha ao enviar convite.'))}>Convidar</Button></div> : null}<Button variant="outline" className="mx-auto flex" onClick={() => setCpu(true)}>Jogar contra CPU</Button><GameRenderer gameId="memoria" /></div>;
}
