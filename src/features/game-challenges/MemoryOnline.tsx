'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppImage } from '@/components/shared';
import { getGameChallenge, acceptGameChallenge, cancelGameChallenge, declineGameChallenge, openGameChallengeStream, playGameChallenge, type GameChallenge } from '@/services/game-challenges/game-challenges-api';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useWinnerSound } from '@/features/new-games/hooks/use-winner-sound';
import { getMemoryCard } from '@/lib/games/memory-card-catalog';

export function MemoryOnline({ challengeId }: { challengeId: string }) {
  const [challenge, setChallenge] = useState<GameChallenge | null>(null);
  const { data: session } = useSession();
  const email = session?.user?.email?.toLowerCase() ?? '';

  useWinnerSound(Boolean(challenge?.status === 'completed' && challenge.winnerEmail));

  useEffect(() => {
    void getGameChallenge(challengeId).then((value) => {
      setChallenge(value);
    }).catch(() => toast.error('Não foi possível carregar o desafio.'));
  }, [challengeId]);

  useEffect(() => {
    if (!challenge?.id) return;
    const close = openGameChallengeStream(challenge.id, (event) => {
      try {
        const data = JSON.parse(event.data) as { snapshot?: GameChallenge; payload?: { snapshot?: GameChallenge } };
        const snapshot = data.payload?.snapshot ?? data.snapshot;
        if (snapshot) setChallenge(snapshot);
      } catch { /* ignora eventos inválidos */ }
    });
    return close;
  }, [challenge?.id]);

  if (!challenge) return null;
  const memory = challenge.memoryState;
  const accept = async () => { try { setChallenge(await acceptGameChallenge(challenge.id)); } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao aceitar.'); } };
  const decline = async () => {
    try {
      const result = await declineGameChallenge(challenge.id);
      setChallenge((current) => current ? { ...current, status: result.status } : current);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao recusar.'); }
  };
  const cancel = async () => {
    try {
      const result = await cancelGameChallenge(challenge.id);
      setChallenge((current) => current ? { ...current, status: result.status } : current);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao cancelar.'); }
  };
  const play = async (index: number) => {
    if (!memory || memory.matched.includes(index) || memory.revealed.includes(index) || challenge.currentTurnEmail?.toLowerCase() !== email) return;
    try {
      await playGameChallenge(challenge.id, { cardIndex: index, version: challenge.stateVersion ?? 0 });
      setChallenge(await getGameChallenge(challenge.id));
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Jogada recusada.'); }
  };

  const isMyTurn = challenge.currentTurnEmail?.toLowerCase() === email;
  const isOpponent = challenge.opponentUserEmail.toLowerCase() === email;
  const opponentName = challenge.challengerUserEmail.toLowerCase() === email ? challenge.opponentName : challenge.challengerName;

  return <Card className="mx-auto max-w-lg"><CardHeader><CardTitle>Desafio de Memória</CardTitle></CardHeader><CardContent className="space-y-4">
    {challenge.status === 'pending' && isOpponent ? <><p>{challenge.challengerName} desafiou você.</p><div className="flex gap-2"><Button onClick={() => void accept()}>Aceitar</Button><Button variant="outline" onClick={() => void decline()}>Recusar</Button></div></> : null}
    {challenge.status === 'pending' && !isOpponent ? <><p className="text-sm text-muted-foreground">Convite enviado para {challenge.opponentName}. A partida começa quando ele aceitar.</p><Button variant="outline" onClick={() => void cancel()}>Cancelar convite</Button></> : null}
    {challenge.status === 'active' && memory ? <><p className="text-sm text-muted-foreground">{isMyTurn ? 'Sua vez: escolha duas cartas.' : `Aguardando ${opponentName}`}</p><div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{memory.cards.map((card) => {
      const visible = memory.matched.includes(card.index) || memory.revealed.includes(card.index);
      const definition = getMemoryCard(card.id);
      return <Button key={card.index} variant="outline" className={`aspect-square overflow-hidden p-1 ${memory.matched.includes(card.index) ? 'border-primary bg-primary/15' : visible ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-secondary'}`} disabled={!isMyTurn || visible} onClick={() => void play(card.index)} aria-label={visible ? definition?.label ?? 'Carta revelada' : 'Revelar carta'}>{visible && definition ? <AppImage src={definition.image} alt={definition.label} width={160} height={160} className="h-full w-full object-contain" /> : <span className="text-2xl" aria-hidden="true">✝️</span>}</Button>;
    })}</div></> : null}
    {challenge.status === 'completed' ? <p className="font-semibold">Partida concluída. Placar: {JSON.stringify(challenge.scores)}</p> : null}
  </CardContent></Card>;
}
