'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { db, seedQuizQuestions, type QuizQuestion } from '@/lib/db';
import { Trophy, Star, Zap, CheckCircle2, XCircle, RotateCcw, Medal, Crown, Award, Flame, TrendingUp, Swords, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createQuizAttempt, listQuizAttempts, type QuizAttempt } from '@/services/quiz/quiz-api';
import { acceptGameChallenge, createQuizChallengeInvite, declineGameChallenge, getGameChallenge, listQuizChallengeInvitees, openGameChallengeStream, playGameChallenge, shareGameChallengeResult, type GameChallenge, type QuizChallengeInvitee } from '@/services/game-challenges/game-challenges-api';
import { WebPageLayout } from '@/components/shared/web';
import { useWinnerSound } from '@/features/new-games/hooks/use-winner-sound';

export default function QuizPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const userEmail = user?.email;
  const setPageTitle = useUIStore((state) => state.setPageTitle);

  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [category, setCategory] = useState<string>('all');
  const [streak, setStreak] = useState(0);
  const [challengeDrawerOpen, setChallengeDrawerOpen] = useState(false);
  const [challengeInvitees, setChallengeInvitees] = useState<QuizChallengeInvitee[]>([]);
  const [selectedChallengeInvitee, setSelectedChallengeInvitee] = useState<QuizChallengeInvitee | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeSending, setChallengeSending] = useState(false);
  const [challengeAvailabilityKnown, setChallengeAvailabilityKnown] = useState(false);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [onlineChallenge, setOnlineChallenge] = useState<GameChallenge | null>(null);
  const [onlineAnswer, setOnlineAnswer] = useState<number | null>(null);

  useWinnerSound(Boolean(onlineChallenge?.status === 'completed' && onlineChallenge.winnerEmail));

  useEffect(() => {
    setPageTitle('Quiz Bíblico');
    seedQuizQuestions();
  }, [setPageTitle]);

  useEffect(() => {
    const challengeId = new URLSearchParams(window.location.search).get('challenge');
    if (!challengeId) return;
    let closeStream: (() => void) | undefined;
    void getGameChallenge(challengeId).then((challenge) => {
      // Compatibilidade para notificações antigas, emitidas quando desafios de
      // memória apontavam para /quiz. A partida deve sempre abrir na interface
      // que conhece o tabuleiro e as jogadas de memória.
      if (challenge.gameType === 'memory') {
        router.replace(`/jogos-novos/memoria?challenge=${encodeURIComponent(challengeId)}`);
        return;
      }
      setOnlineChallenge(challenge);
      closeStream = openGameChallengeStream(challengeId, (event) => {
        try {
          const data = JSON.parse(event.data) as { snapshot?: GameChallenge; payload?: { snapshot?: GameChallenge } };
          const snapshot = data.payload?.snapshot ?? data.snapshot;
          if (snapshot) {
            setOnlineChallenge(snapshot);
            setOnlineAnswer(null);
          }
        } catch { /* evento inválido é ignorado */ }
      });
    }).catch(() => toast.error('Não foi possível carregar este desafio.'));
    return () => closeStream?.();
  }, [router]);

  const acceptOnlineChallenge = async () => {
    if (!onlineChallenge) return;
    try {
      setOnlineAnswer(null);
      setOnlineChallenge(await acceptGameChallenge(onlineChallenge.id));
      toast.success('Desafio aceito!');
    }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível aceitar o desafio.'); }
  };

  const answerOnlineChallenge = async (answerIndex: number) => {
    if (!onlineChallenge || onlineChallenge.currentTurnEmail?.toLowerCase() !== userEmail?.toLowerCase() || onlineAnswer !== null) return;
    setOnlineAnswer(answerIndex);
    try {
      await playGameChallenge(onlineChallenge.id, { answerIndex, version: onlineChallenge.stateVersion ?? 0 });
      // O SSE normalmente atualiza a tela. Esta leitura evita que uma conexão
      // lenta deixe o jogador preso no estado anterior enquanto o evento chega.
      const refreshed = await getGameChallenge(onlineChallenge.id);
      setOnlineChallenge(refreshed);
      setOnlineAnswer(null);
    }
    catch (error) { setOnlineAnswer(null); toast.error(error instanceof Error ? error.message : 'Jogada recusada.'); }
  };

  const shareOnlineResult = async () => {
    if (!onlineChallenge) return;
    try { await shareGameChallengeResult(onlineChallenge.id); toast.success('Resultado compartilhado no feed.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível compartilhar o resultado.'); }
  };

  const loadAttempts = useCallback(async () => {
    try {
      const data = await listQuizAttempts();
      setAttempts(Array.isArray(data) ? data : []);
    } catch {
      setAttempts([]);
    }
  }, []);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts]);

  useEffect(() => {
    if (!userEmail) return;
    void listQuizChallengeInvitees()
      .then((invitees) => setChallengeInvitees(Array.isArray(invitees) ? invitees : []))
      .catch(() => setChallengeInvitees([]))
      .finally(() => setChallengeAvailabilityKnown(true));
  }, [userEmail]);

  const userAttempts = useMemo(
    () => (userEmail ? attempts.filter((attempt) => attempt.userId === userEmail) : []),
    [attempts, userEmail]
  );

  const userStats = useMemo(() => {
    if (!userAttempts || userAttempts.length === 0) return null;
    const totalScore = userAttempts.reduce((sum, a) => sum + a.score, 0);
    const bestScore = Math.max(...userAttempts.map(a => a.score));
    const totalCorrect = userAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);
    const totalQuestions = userAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
    return { 
      totalScore, 
      bestScore, 
      gamesPlayed: userAttempts.length, 
      totalCorrect, 
      totalQuestions, 
      accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0 
    };
  }, [userAttempts]);

  const ranking = useMemo(() => {
    const userMap = new Map<string, { userName: string; bestScore: number; totalScore: number; gamesPlayed: number }>();
    attempts.forEach(a => {
      const existing = userMap.get(a.userId);
      if (existing) {
        existing.bestScore = Math.max(existing.bestScore, a.score);
        existing.totalScore += a.score;
        existing.gamesPlayed += 1;
      } else {
        userMap.set(a.userId, { userName: a.userName, bestScore: a.score, totalScore: a.score, gamesPlayed: 1 });
      }
    });
    return Array.from(userMap.entries()).map(([userId, data]) => ({ userId, ...data })).sort((a, b) => b.totalScore - a.totalScore);
  }, [attempts]);

  const saveAttempt = useCallback(async (attempt: {
    userId: string;
    userName: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
  }) => {
    const saved = await createQuizAttempt(attempt);
    setAttempts((current) => [saved, ...current]);
  }, []);

  const openChallengeDrawer = async () => {
    setChallengeDrawerOpen(true);
    setChallengeLoading(true);
    setSelectedChallengeInvitee(null);
    try {
      const invitees = await listQuizChallengeInvitees();
      setChallengeInvitees(Array.isArray(invitees) ? invitees : []);
    } catch {
      setChallengeInvitees([]);
      toast.error('Não foi possível carregar os membros disponíveis para o desafio.');
    } finally {
      setChallengeAvailabilityKnown(true);
      setChallengeLoading(false);
    }
  };

  const sendChallengeInvite = async () => {
    if (!selectedChallengeInvitee) return;
    setChallengeSending(true);
    try {
      await createQuizChallengeInvite(selectedChallengeInvitee.email);
      toast.success(`Convite enviado para ${selectedChallengeInvitee.name}.`);
      setChallengeDrawerOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o convite.');
    } finally {
      setChallengeSending(false);
    }
  };

  const startGame = useCallback(async () => {
    let allQ = await db.quizQuestions.toArray();
    if (difficulty !== 'all') allQ = allQ.filter(q => q.difficulty === difficulty);
    if (category !== 'all') allQ = allQ.filter(q => q.category === category);
    
    if (allQ.length === 0) { 
      toast.error('Sem perguntas para esses filtros'); 
      return; 
    }
    
    const shuffled = allQ.sort(() => Math.random() - 0.5).slice(0, 10);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setStreak(0);
    setGameState('playing');
  }, [difficulty, category]);

  const handleAnswer = (index: number) => {
    if (showAnswer) return;
    setSelectedAnswer(index);
    setShowAnswer(true);
    const q = questions[currentIndex];
    if (index === q.correctIndex) {
      const streakBonus = streak >= 3 ? Math.floor(q.points * 0.5) : 0;
      setScore(s => s + q.points + streakBonus);
      setCorrectCount(c => c + 1);
      setStreak(s => s + 1);
      if (streakBonus > 0) toast.success(`🔥 Streak x${streak + 1}! +${streakBonus} bônus`);
    } else { 
      setStreak(0); 
    }
  };

  const nextQuestion = async () => {
    if (currentIndex + 1 >= questions.length) {
      if (user?.email) {
        const attempt = {
          userId: user.email, 
          userName: user.name || 'Jogador', 
          score,
          totalQuestions: questions.length, 
          correctAnswers: correctCount,
          completedAt: new Date().toISOString(),
        };
        try {
          await saveAttempt(attempt);
          if (userStats && score > userStats.bestScore) toast.success('🏆 Novo recorde pessoal!');
        } catch {
          toast.error('Resultado concluído, mas a pontuação não pôde ser salva no ranking. Tente novamente quando estiver online.');
        }
      }
      setGameState('result');
      return;
    }
    setCurrentIndex(i => i + 1);
    setSelectedAnswer(null);
    setShowAnswer(false);
  };

  const currentQ = questions[currentIndex];
  const onlineTurnIsMine = onlineChallenge?.currentTurnEmail?.toLowerCase() === userEmail?.toLowerCase();
  const onlineOpponentName = onlineChallenge
    ? (onlineChallenge.challengerUserEmail.toLowerCase() === userEmail?.toLowerCase()
      ? onlineChallenge.opponentName
      : onlineChallenge.challengerName)
    : 'outro jogador';
  const onlineScores = onlineChallenge?.scores ?? {};
  
  const getRankIcon = (pos: number) => {
    if (pos === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (pos === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (pos === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 text-center text-sm font-bold text-muted-foreground">{pos + 1}</span>;
  };

  return (
    <WebPageLayout>
      <>
        {onlineChallenge?.status === 'pending' ? (
          <Card className="mb-4 border-primary/30 bg-primary/5"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">{onlineChallenge.challengerName} desafiou você</p><p className="text-sm text-muted-foreground">Partida de {onlineChallenge.gameType === 'quiz-bomba' ? 'Quiz Bomba' : 'Quiz Bíblico'}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => void acceptOnlineChallenge()}>Aceitar</Button><Button size="sm" variant="outline" onClick={() => void declineGameChallenge(onlineChallenge.id).then(() => setOnlineChallenge(null))}>Recusar</Button></div></CardContent></Card>
        ) : null}
        {onlineChallenge?.status === 'active' ? (
          <Card className="mb-4 border-primary/30"><CardHeader><CardTitle>Desafio online</CardTitle><p className="text-sm text-muted-foreground">{onlineTurnIsMine ? 'Sua vez' : `Aguardando ${onlineOpponentName}`}</p><p className="text-xs text-muted-foreground">{onlineChallenge.challengerName} x {onlineChallenge.opponentName}</p></CardHeader><CardContent className="space-y-3">
            {onlineChallenge.currentQuestionData ? <><p className="font-medium">{onlineChallenge.currentQuestionData.question}</p>{onlineChallenge.currentQuestionData.options.map((option, index) => <Button key={option} variant={onlineAnswer === index ? 'default' : 'outline'} className="w-full justify-start" disabled={!onlineTurnIsMine || onlineAnswer !== null} onClick={() => void answerOnlineChallenge(index)}>{option}</Button>)}</> : <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">Aguardando a próxima pergunta do desafio.</p>}
            <div className="flex justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground"><span>Você: {onlineScores[userEmail?.toLowerCase() ?? ''] ?? 0} pts</span><span>{onlineOpponentName}: {onlineScores[(onlineChallenge.challengerUserEmail.toLowerCase() === userEmail?.toLowerCase() ? onlineChallenge.opponentUserEmail : onlineChallenge.challengerUserEmail).toLowerCase()] ?? 0} pts</span></div>
          </CardContent></Card>
        ) : null}
        {onlineChallenge?.status === 'completed' ? (
          <Card className="mb-4 border-primary/30"><CardHeader><CardTitle>Desafio concluído</CardTitle></CardHeader><CardContent className="flex items-center justify-between gap-3"><p className="text-sm text-muted-foreground">A partida terminou. Compartilhe o resultado no feed.</p><Button size="sm" onClick={() => void shareOnlineResult()}>Compartilhar</Button></CardContent></Card>
        ) : null}
        {!onlineChallenge && gameState === 'menu' && (
          <div key="menu" className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Quiz Bíblico</CardTitle>
                <p className="text-muted-foreground text-sm">Teste seus conhecimentos e suba no ranking!</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {userStats && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-background/60 rounded-xl p-3 text-center">
                      <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{userStats.totalScore}</p>
                      <p className="text-[10px] text-muted-foreground">Total pts</p>
                    </div>
                    <div className="bg-background/60 rounded-xl p-3 text-center">
                      <Star className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{userStats.bestScore}</p>
                      <p className="text-[10px] text-muted-foreground">Recorde</p>
                    </div>
                    <div className="bg-background/60 rounded-xl p-3 text-center">
                      <Zap className="w-4 h-4 text-green-500 mx-auto mb-1" />
                      <p className="text-lg font-bold text-foreground">{userStats.accuracy}%</p>
                      <p className="text-[10px] text-muted-foreground">Precisão</p>
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Dificuldade</p>
                    <Select value={difficulty} onValueChange={v => setDifficulty(v as any)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="easy">Fácil</SelectItem>
                        <SelectItem value="medium">Médio</SelectItem>
                        <SelectItem value="hard">Difícil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground">Tema</p>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Antigo Testamento">Antigo Testamento</SelectItem>
                        <SelectItem value="Novo Testamento">Novo Testamento</SelectItem>
                        <SelectItem value="Geral">Geral</SelectItem>
                        <SelectItem value="Músicas">Músicas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" size="lg" onClick={startGame}>
                    <Zap className="w-5 h-5 mr-2" /> Jogar
                  </Button>
                  {challengeAvailabilityKnown && challengeInvitees.length > 0 ? <Button variant="outline" size="lg" onClick={() => void openChallengeDrawer()}>
                    <Swords className="w-5 h-5 mr-2" /> Desafiar
                  </Button> : null}
                </div>
              </CardContent>
            </Card>

            {/* Ranking */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Ranking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="total">
                  <TabsList className="w-full mb-3">
                    <TabsTrigger value="total" className="flex-1">Total</TabsTrigger>
                    <TabsTrigger value="best" className="flex-1">Melhor Partida</TabsTrigger>
                  </TabsList>
                  <TabsContent value="total">
                    {ranking.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tentativa ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {ranking.slice(0, 10).map((r, i) => (
                          <div key={r.userId} className={cn('flex items-center gap-3 p-3 rounded-xl', r.userId === user?.email ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50')}>
                            {getRankIcon(i)}
                            <span className="flex-1 text-sm font-medium truncate">{r.userName}</span>
                            <div className="text-right">
                              <Badge variant={i < 3 ? 'default' : 'secondary'} className="text-xs">{r.totalScore} pts</Badge>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{r.gamesPlayed} partidas</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="best">
                    {ranking.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tentativa ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {[...ranking].sort((a, b) => b.bestScore - a.bestScore).slice(0, 10).map((r, i) => (
                          <div key={r.userId} className={cn('flex items-center gap-3 p-3 rounded-xl', r.userId === user?.email ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50')}>
                            {getRankIcon(i)}
                            <span className="flex-1 text-sm font-medium truncate">{r.userName}</span>
                            <Badge variant={i < 3 ? 'default' : 'secondary'} className="text-xs">{r.bestScore} pts</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {!onlineChallenge && gameState === 'playing' && currentQ && (
          <div key="playing" className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{currentIndex + 1}/{questions.length}</Badge>
              <div className="flex items-center gap-3">
                {streak >= 2 && (
                  <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                    <Flame className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-500">x{streak}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="font-bold text-foreground">{score}</span>
                </div>
              </div>
              <Badge variant={currentQ.difficulty === 'easy' ? 'secondary' : currentQ.difficulty === 'medium' ? 'default' : 'destructive'}>
                {currentQ.difficulty === 'easy' ? 'Fácil' : currentQ.difficulty === 'medium' ? 'Médio' : 'Difícil'}
              </Badge>
            </div>
            <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-2" />
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">{currentQ.category}</p>
                <h3 className="text-lg font-semibold mb-4">{currentQ.question}</h3>
                <div className="space-y-2">
                  {currentQ.options.map((opt, i) => {
                    const isCorrect = i === currentQ.correctIndex;
                    const isSelected = i === selectedAnswer;
                    return (
                      <button key={i} onClick={() => handleAnswer(i)}
                        className={cn(
                          'w-full text-left p-3 rounded-xl border-2 transition-all text-sm font-medium',
                          showAnswer && isCorrect && 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400',
                          showAnswer && isSelected && !isCorrect && 'border-destructive bg-destructive/10 text-destructive',
                          !showAnswer && 'border-border hover:border-primary/50 hover:bg-primary/5',
                          !showAnswer && isSelected && 'border-primary bg-primary/10'
                        )} disabled={showAnswer}>
                        <span className="flex items-center gap-2">
                          {showAnswer && isCorrect && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          {showAnswer && isSelected && !isCorrect && <XCircle className="w-4 h-4 shrink-0" />}
                          {opt}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {showAnswer && (
                  <div className="mt-4">
                    <Button className="w-full" onClick={nextQuestion}>
                      {currentIndex + 1 >= questions.length ? 'Ver Resultado' : 'Próxima →'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {!onlineChallenge && gameState === 'result' && (
          <div key="result" className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <Card className="text-center border-primary/20">
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">Quiz Concluído!</h2>
                <div className="text-4xl font-extrabold text-primary">{score} <span className="text-lg text-muted-foreground">pontos</span></div>
                <p className="text-muted-foreground">{correctCount} de {questions.length} corretas ({Math.round((correctCount / questions.length) * 100)}%)</p>
                {userStats && (
                  <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Seus recordes</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><p className="text-muted-foreground">Melhor partida</p><p className="font-bold">{Math.max(userStats.bestScore, score)} pts</p></div>
                      <div><p className="text-muted-foreground">Total acumulado</p><p className="font-bold">{userStats.totalScore + score} pts</p></div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 justify-center pt-2">
                  <Button onClick={() => setGameState('menu')} variant="outline"><RotateCcw className="w-4 h-4 mr-1" /> Menu</Button>
                  <Button onClick={startGame}><Zap className="w-4 h-4 mr-1" /> Jogar Novamente</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </>
      <Drawer open={challengeDrawerOpen} onOpenChange={setChallengeDrawerOpen}>
        <DrawerContent className="mx-auto max-h-[82dvh] max-w-lg">
          <DrawerHeader className="border-b border-border/60 text-left">
            <DrawerTitle className="flex items-center gap-2"><Swords className="h-5 w-5 text-primary" />Desafiar membro</DrawerTitle>
            <DrawerDescription>Escolha quem receberá um convite para jogar Quiz Bíblico.</DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 overflow-y-auto p-4">
            {challengeLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando membros...</p> : null}
            {!challengeLoading && challengeInvitees.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum outro membro com acesso ao Quiz está disponível.</p> : null}
            {!challengeLoading && challengeInvitees.length > 0 ? (
              <div className="space-y-2">
                {challengeInvitees.map((invitee) => {
                  const selected = selectedChallengeInvitee?.email === invitee.email;
                  return (
                    <button
                      key={invitee.email}
                      type="button"
                      onClick={() => setSelectedChallengeInvitee(invitee)}
                      className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors', selected ? 'border-primary bg-primary/10' : 'border-border/60 bg-card hover:border-primary/40')}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">{invitee.name.charAt(0).toUpperCase()}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{invitee.name}</span><span className="block truncate text-xs text-muted-foreground">{invitee.email}</span></span>
                      {selected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Users className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <DrawerFooter className="border-t border-border/60">
            <Button onClick={() => void sendChallengeInvite()} disabled={!selectedChallengeInvitee || challengeSending}>{challengeSending ? 'Enviando convite...' : 'Enviar convite'}</Button>
            <Button variant="outline" onClick={() => setChallengeDrawerOpen(false)} disabled={challengeSending}>Cancelar</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </WebPageLayout>
  );
}
