'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Flame, Trophy, ShoppingBag, Gamepad2, MessageCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import {
  getDailyDevotional, getDevotionalStreak, hasReadDevotionalToday, markDevotionalRead,
  markChallengeCompleted, isChallengeCompleted, getTotalPoints,
} from '@/lib/devotional';
import { toast } from 'sonner';
import { hasActionPermission, hasAnyActionPermission } from '@/lib/access-control';
import { getCanteenAccess } from '@/lib/canteen/access';
import { CANTEEN_PURCHASE_HREF } from '@/lib/canteen/navigation';
import { getEngagementProfile, updateEngagementProfile } from '@/services/engagement/engagement-api';
import type { EngagementProfile } from '@/services/engagement/engagement-api';
import { useBibleReadingStore } from '@/features/bible/store';

export function MemberDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { canOrder } = getCanteenAccess(user);
  const canPlayGames = hasActionPermission(user, 'games', 'view');
  const canReadBible = hasActionPermission(user, 'bible', 'view');
  const canViewFeed = hasActionPermission(user, 'feed', 'view');
  const canViewGroups = hasAnyActionPermission(user, 'groups', ['view', 'request']);
  const setBibleBook = useBibleReadingStore((state) => state.setBook);
  const setBibleChapter = useBibleReadingStore((state) => state.setChapter);

  // Devotional State - Inicialização direta
  const [devotional] = useState(() => getDailyDevotional());
  const [streak, setStreak] = useState(() => getDevotionalStreak());
  const [points, setPoints] = useState(() => getTotalPoints());
  const [rank, setRank] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<NonNullable<EngagementProfile['leaderboard']>>([]);
  const [challengeDone, setChallengeDone] = useState(false);
  const [devotionalRead, setDevotionalRead] = useState(() => hasReadDevotionalToday());
  useEffect(() => {
    if (devotional) {
      setChallengeDone(isChallengeCompleted(devotional.id));
    }
  }, [devotional]);

  useEffect(() => {
    const loadEngagement = async () => {
      try {
        const data = await getEngagementProfile();
        setStreak(Number(data.devotionalStreak) || 0);
        setPoints(Number(data.points) || 0);
        setRank(typeof data.rank === 'number' ? data.rank : null);
        setLeaderboard(data.leaderboard ?? []);
        setDevotionalRead(Boolean(data.devotionalReadToday));
        setChallengeDone(Array.isArray(data.completedChallengeIds) && data.completedChallengeIds.includes(devotional.id));
      } catch {
        setStreak(getDevotionalStreak());
        setPoints(getTotalPoints());
        setRank(null);
        setLeaderboard([]);
        setDevotionalRead(hasReadDevotionalToday());
      }
    };

    void loadEngagement();
  }, [devotional.id]);

  const handleReadDevotional = () => {
    const persist = async () => {
      try {
        const data = await updateEngagementProfile({ action: 'markDevotionalRead' });
        setStreak(Number(data.devotionalStreak) || 0);
        setPoints(Number(data.points) || 0);
        setRank(typeof data.rank === 'number' ? data.rank : null);
        setLeaderboard(data.leaderboard ?? []);
        setDevotionalRead(Boolean(data.devotionalReadToday));
      } catch {
        const newStreak = markDevotionalRead();
        setStreak(newStreak);
        setDevotionalRead(true);
      } finally {
        toast.success('Devocional lido! Continue assim!');
      }
    };

    void persist();
  };

  const handleCompleteChallenge = () => {
    if (!devotional) return;

    const persist = async () => {
      try {
        const data = await updateEngagementProfile({ action: 'completeChallenge', devotionalId: devotional.id });
        setPoints(Number(data.points) || 0);
      } catch {
        markChallengeCompleted(devotional.id);
        setPoints(getTotalPoints());
      } finally {
        setChallengeDone(true);
        toast.success(`Desafio completo! +${devotional.challengePoints} pontos`);
      }
    };

    void persist();
  };

  const openDevotionalVerse = () => {
    setBibleBook(devotional.bookAbbrev);
    setBibleChapter(devotional.chapter);
    router.push(`/bible?book=${encodeURIComponent(devotional.bookAbbrev)}&chapter=${devotional.chapter}&verse=${devotional.verseNumber}`);
  };

  if (!devotional) return <div>Carregando...</div>;

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-20 sm:space-y-6">
      <Card className="animate__animated animate__zoomIn border-border bg-card p-3 sm:p-4">
        <div className="grid grid-cols-3 gap-2 text-center sm:gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{points}</p>
            <p className="text-[10px] text-muted-foreground">Pontos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{streak} 🔥</p>
            <p className="text-[10px] text-muted-foreground">Dias Seguidos</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">{rank ? `#${rank}` : '-'}</p>
            <p className="text-[10px] text-muted-foreground">Ranking</p>
          </div>
        </div>
      </Card>

      <Card className="animate__animated animate__fadeIn border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">Ranking da igreja</h3>
          </div>
          <span className="text-[10px] text-muted-foreground">Desafios + jogos</span>
        </div>
        <div className="space-y-2 p-3 sm:p-4">
          {leaderboard.slice(0, 5).map((member, index) => (
            <div key={member.memberId} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${member.userEmail === user?.email ? 'bg-primary/10 ring-1 ring-primary/20' : 'bg-muted/40'}`}>
              <span className="w-5 text-center text-xs font-bold text-muted-foreground">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{member.memberName}</span>
              <Badge variant={index < 3 ? 'default' : 'secondary'} className="text-[10px]">{member.points} pts</Badge>
            </div>
          ))}
          {leaderboard.length === 0 ? <p className="py-2 text-center text-xs text-muted-foreground">Nenhum membro aprovado no ranking.</p> : null}
        </div>
      </Card>

      {/* Devotional Card */}
      <Card className="animate__animated animate__zoomIn overflow-hidden border-border">
          <div className="flex items-center justify-between bg-primary/5 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-sm">Devocional do Dia</h3>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1">
              <Flame className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs font-bold text-warning">{streak} dias</span>
            </div>
          )}
        </div>
        <div className="space-y-3 p-3 sm:p-4">
          <blockquote className="border-l-4 border-primary pl-3 italic text-sm text-foreground/90">
            "{devotional.verse}"
          </blockquote>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-primary">{devotional.reference}</p>
            {canReadBible ? <Button type="button" variant="link" size="sm" className="h-auto gap-1 p-0 text-xs" onClick={openDevotionalVerse}>
              <BookOpen className="h-3.5 w-3.5" /> Ler agora
            </Button> : null}
          </div>
          
          {!devotionalRead ? (
            <>
              <p className="text-sm text-muted-foreground">{devotional.reflection}</p>
              <Button size="sm" className="mt-2 w-full gap-2" onClick={handleReadDevotional}>
                <BookOpen className="w-4 h-4" /> Marcar como lido
              </Button>
            </>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="rounded-lg bg-success/10 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Devocional lido hoje</span>
                </div>
              </div>

              {!challengeDone ? (
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-warning" />
                    <span className="text-sm font-semibold">Desafio do dia</span>
                    {devotional.challengePoints ? (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        +{devotional.challengePoints} pts
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{devotional.challenge}</p>
                  <Button size="sm" variant="outline" className="mt-3 w-full gap-2" onClick={handleCompleteChallenge}>
                    <Trophy className="h-3.5 w-3.5" />
                    Resgatar pontos do desafio
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {canOrder ? <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push(CANTEEN_PURCHASE_HREF)}>
          <ShoppingBag className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Fazer Pedido</span>
        </Button> : null}
        {canPlayGames ? <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/quiz')}>
          <Trophy className="h-6 w-6 text-warning" />
          <span className="text-xs font-medium">Quiz Bíblico</span>
        </Button> : null}
        {canPlayGames ? <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/jogos-novos')}>
          <Gamepad2 className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Jogos</span>
        </Button> : null}
        {canReadBible ? <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/bible')}>
          <BookOpen className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Ler Bíblia</span>
        </Button> : null}
        {canViewFeed ? <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/feed')}>
          <MessageCircle className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Comunidade</span>
        </Button> : null}
        {canViewGroups ? <Button variant="outline" className="h-20 flex-col gap-2 border-border bg-card hover:bg-muted/50" onClick={() => router.push('/groups?type=team')}>
          <UserPlus className="w-6 h-6 text-primary" />
          <span className="text-xs font-medium">Entrar em Grupo</span>
        </Button> : null}
      </div>

    </div>
  );
}
