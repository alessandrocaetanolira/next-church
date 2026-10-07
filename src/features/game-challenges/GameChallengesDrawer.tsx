'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Swords } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useDrawer } from '@/components/providers/DrawerProvider';
import { acceptGameChallenge, cancelGameChallenge, declineGameChallenge, listGameChallenges, type GameChallenge } from '@/services/game-challenges/game-challenges-api';

const gameLabel = (gameType: string) => gameType === 'memory' ? 'Memória' : gameType === 'quiz-bomba' ? 'Quiz Bomba' : 'Quiz Bíblico';
const gameHref = (challenge: GameChallenge) => challenge.gameType === 'memory'
  ? `/jogos-novos/memoria?challenge=${encodeURIComponent(challenge.id)}`
  : `/quiz?challenge=${encodeURIComponent(challenge.id)}&game=${encodeURIComponent(challenge.gameType)}`;

function PendingChallengesDrawer({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const userEmail = session?.user?.email?.trim().toLowerCase() ?? '';
  const [challenges, setChallenges] = useState<GameChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listGameChallenges();
      setChallenges(result.filter((challenge) => challenge.status === 'pending'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar os desafios.');
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('church:game-challenge-updated', refresh);
    return () => window.removeEventListener('church:game-challenge-updated', refresh);
  }, [load]);

  const accept = async (challenge: GameChallenge) => {
    setActingId(challenge.id);
    try {
      await acceptGameChallenge(challenge.id);
      onClose();
      router.push(gameHref(challenge));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível aceitar o desafio.');
      void load();
    } finally {
      setActingId(null);
    }
  };

  const dismiss = async (challenge: GameChallenge, action: 'decline' | 'cancel') => {
    setActingId(challenge.id);
    try {
      if (action === 'decline') await declineGameChallenge(challenge.id);
      else await cancelGameChallenge(challenge.id);
      setChallenges((current) => current.filter((item) => item.id !== challenge.id));
      window.dispatchEvent(new CustomEvent('church:game-challenge-updated'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível atualizar o desafio.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <>
      <DrawerHeader className="text-left">
        <DrawerTitle>Desafios</DrawerTitle>
      </DrawerHeader>
      <div className="space-y-3 px-4 pb-6">
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando desafios...</p> : null}
        {!loading && challenges.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Sem desafios pendentes.</p> : null}
        {!loading ? challenges.map((challenge) => {
          const isRecipient = challenge.opponentUserEmail.trim().toLowerCase() === userEmail;
          const otherName = isRecipient ? challenge.challengerName : challenge.opponentName;
          const acting = actingId === challenge.id;
          return <Card key={challenge.id} className="border-primary/30 bg-primary/5"><CardContent className="space-y-3 p-4"><div><p className="font-semibold">{isRecipient ? `${otherName} desafiou você` : `Convite enviado para ${otherName}`}</p><p className="text-sm text-muted-foreground">{gameLabel(challenge.gameType)} · {isRecipient ? 'Aceite para iniciar a partida.' : 'Aguardando aceite do participante.'}</p></div>{isRecipient ? <div className="flex gap-2"><Button size="sm" disabled={acting} onClick={() => void accept(challenge)}>{acting ? 'Aceitando...' : 'Aceitar'}</Button><Button size="sm" variant="outline" disabled={acting} onClick={() => void dismiss(challenge, 'decline')}>Recusar</Button></div> : <Button size="sm" variant="outline" disabled={acting} onClick={() => void dismiss(challenge, 'cancel')}>Cancelar convite</Button>}</CardContent></Card>;
        }) : null}
      </div>
    </>
  );
}

function useOpenChallengesDrawer() {
  const { openDrawer, closeDrawer } = useDrawer();
  return () => openDrawer({
    contentClassName: 'max-h-[80dvh]',
    content: <PendingChallengesDrawer onClose={closeDrawer} />,
  });
}

/** Ação única de desafios do hub de Jogos, com convites pendentes no drawer padrão. */
export function GameChallengesButton() {
  const openChallengesDrawer = useOpenChallengesDrawer();
  return <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2 rounded-xl" onClick={openChallengesDrawer}><Swords className="h-4 w-4" />Desafios</Button>;
}

/** Aviso compacto para uma tela de jogo quando ela possui convite pendente. */
export function PendingGameChallengesNotice({ gameType }: { gameType: string }) {
  const openChallengesDrawer = useOpenChallengesDrawer();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const challenges = await listGameChallenges();
      setCount(challenges.filter((challenge) => challenge.status === 'pending' && challenge.gameType === gameType).length);
    } catch {
      setCount(0);
    }
  }, [gameType]);

  useEffect(() => {
    void refresh();
    const handleUpdate = () => void refresh();
    window.addEventListener('church:game-challenge-updated', handleUpdate);
    return () => window.removeEventListener('church:game-challenge-updated', handleUpdate);
  }, [refresh]);

  if (!count) return null;
  return <Card className="mx-auto max-w-lg border-primary/30 bg-primary/5"><CardContent className="flex items-center justify-between gap-3 p-3"><div className="min-w-0"><p className="font-medium">{count === 1 ? 'Você tem um desafio pendente' : `Você tem ${count} desafios pendentes`}</p><p className="text-xs text-muted-foreground">Abra para aceitar, recusar ou acompanhar o convite.</p></div><Button type="button" variant="outline" size="sm" className="shrink-0" onClick={openChallengesDrawer}>Ver</Button></CardContent></Card>;
}
