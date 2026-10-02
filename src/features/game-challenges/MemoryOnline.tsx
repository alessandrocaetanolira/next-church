'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getGameChallenge, acceptGameChallenge, declineGameChallenge, openGameChallengeStream, playGameChallenge, type GameChallenge } from '@/services/game-challenges/game-challenges-api';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useWinnerSound } from '@/features/new-games/hooks/use-winner-sound';

export function MemoryOnline() {
  const [challenge, setChallenge] = useState<GameChallenge | null>(null);
  const { data: session } = useSession();
  const email = session?.user?.email?.toLowerCase() ?? '';

  useWinnerSound(challenge?.status === 'completed' && challenge.winnerEmail?.toLowerCase() === email);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('challenge');
    if (!id) return;
    void getGameChallenge(id).then((value) => {
      setChallenge(value);
    }).catch(() => toast.error('Não foi possível carregar o desafio.'));
  }, []);

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
  const play = async (index: number) => {
    if (!memory || memory.matched.includes(index) || memory.revealed.includes(index) || challenge.currentTurnEmail?.toLowerCase() !== email) return;
    try {
      await playGameChallenge(challenge.id, { cardIndex: index, version: challenge.stateVersion ?? 0 });
      setChallenge(await getGameChallenge(challenge.id));
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Jogada recusada.'); }
  };

  const isMyTurn = challenge.currentTurnEmail?.toLowerCase() === email;
  const opponentName = challenge.challengerUserEmail.toLowerCase() === email ? challenge.opponentName : challenge.challengerName;

  return <Card className="mx-auto max-w-lg"><CardHeader><CardTitle>Desafio de Memória</CardTitle></CardHeader><CardContent className="space-y-4">
    {challenge.status === 'pending' ? <><p>{challenge.challengerName} desafiou você.</p><div className="flex gap-2"><Button onClick={() => void accept()}>Aceitar</Button><Button variant="outline" onClick={() => void declineGameChallenge(challenge.id)}>Recusar</Button></div></> : null}
    {challenge.status === 'active' && memory ? <><p className="text-sm text-muted-foreground">{isMyTurn ? 'Sua vez' : `Aguardando ${opponentName}`}</p><div className="grid grid-cols-4 gap-2">{memory.cards.map((card) => <Button key={card.index} variant={memory.matched.includes(card.index) || memory.revealed.includes(card.index) ? 'default' : 'outline'} className="aspect-square p-0 text-lg" disabled={!isMyTurn} onClick={() => void play(card.index)}>{memory.matched.includes(card.index) || memory.revealed.includes(card.index) ? card.id.replace('memory-', '') : '?'}</Button>)}</div></> : null}
    {challenge.status === 'completed' ? <p className="font-semibold">Partida concluída. Placar: {JSON.stringify(challenge.scores)}</p> : null}
  </CardContent></Card>;
}
