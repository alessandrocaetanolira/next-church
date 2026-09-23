'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/features/ui/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { db, seedOfflineData } from '@/lib/db';
import { Trophy, Star, CheckCircle2, XCircle, RotateCcw, Gamepad2, Type, Grid3X3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ===== VERDADEIRO OU FALSO =====
const TRUE_FALSE_QUESTIONS = [
  { statement: 'Moisés dividiu o Mar Vermelho.', answer: true, explanation: 'Deus dividiu o Mar Vermelho através de Moisés (Êxodo 14).' },
  { statement: 'Jesus nasceu em Nazaré.', answer: false, explanation: 'Jesus nasceu em Belém (Mateus 2:1).' },
  { statement: 'A Bíblia tem 66 livros.', answer: true, explanation: 'São 39 do AT e 27 do NT.' },
  { statement: 'Davi foi o primeiro rei de Israel.', answer: false, explanation: 'Saul foi o primeiro rei (1 Samuel 10).' },
  { statement: 'Jonas foi engolido por uma baleia.', answer: false, explanation: 'A Bíblia diz "grande peixe" (Jonas 1:17).' },
  { statement: 'Paulo escreveu a maioria das epístolas do NT.', answer: true, explanation: 'Paulo escreveu 13 epístolas.' },
  { statement: 'Adão e Eva tiveram apenas dois filhos.', answer: false, explanation: 'Tiveram Caim, Abel, Sete e outros (Gênesis 5:4).' },
  { statement: 'O Salmo 23 foi escrito por Davi.', answer: true, explanation: 'O Salmo 23 é de autoria de Davi.' },
  { statement: 'Jesus jejuou 30 dias no deserto.', answer: false, explanation: 'Foram 40 dias (Mateus 4:2).' },
  { statement: 'Apocalipse é o último livro da Bíblia.', answer: true, explanation: 'Apocalipse de João é o 66º livro.' },
  { statement: 'Pedro caminhou sobre as águas.', answer: true, explanation: 'Pedro andou sobre a água em direção a Jesus (Mateus 14:29).' },
  { statement: 'Sansão tinha força nos cabelos.', answer: false, explanation: 'Sua força vinha de Deus, o cabelo era símbolo do voto nazireu (Juízes 16).' },
];

// ===== COMPLETE O VERSÍCULO =====
const COMPLETE_VERSE_DATA = [
  { verse: 'O Senhor é o meu ___; nada me faltará.', answer: 'pastor', reference: 'Salmos 23:1' },
  { verse: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho ___.', answer: 'unigênito', reference: 'João 3:16' },
  { verse: 'Eu sou o ___, a verdade e a vida.', answer: 'caminho', reference: 'João 14:6' },
  { verse: 'Tudo posso naquele que me ___.', answer: 'fortalece', reference: 'Filipenses 4:13' },
  { verse: 'No princípio, Deus criou os ___ e a terra.', answer: 'céus', reference: 'Gênesis 1:1' },
  { verse: 'O ___ do Senhor é o princípio da sabedoria.', answer: 'temor', reference: 'Provérbios 9:10' },
  { verse: 'Lâmpada para os meus pés é a tua ___.', answer: 'palavra', reference: 'Salmos 119:105' },
  { verse: 'Busquem primeiro o ___ de Deus e a sua justiça.', answer: 'Reino', reference: 'Mateus 6:33' },
];

// ===== JOGO DA FORCA =====
const HANGMAN_WORDS = [
  { word: 'JERUSALÉM', hint: 'Cidade Santa', category: 'Lugares' },
  { word: 'MOISÉS', hint: 'Libertou o povo do Egito', category: 'Personagens' },
  { word: 'GÓLGOTA', hint: 'Local da crucificação', category: 'Lugares' },
  { word: 'ABRAÃO', hint: 'Pai da fé', category: 'Personagens' },
  { word: 'BATISMO', hint: 'Sacramento de água', category: 'Termos' },
  { word: 'SALOMÃO', hint: 'Rei mais sábio', category: 'Personagens' },
  { word: 'TABERNÁCULO', hint: 'Tenda sagrada no deserto', category: 'Lugares' },
  { word: 'PENTECOSTES', hint: 'Descida do Espírito Santo', category: 'Eventos' },
  { word: 'PARÁBOLA', hint: 'História com lição moral', category: 'Termos' },
  { word: 'FILISTEUS', hint: 'Povo inimigo de Israel', category: 'Povos' },
];

// ===== CAÇA-PALAVRAS =====
const WORD_SEARCH_SETS = [
  { theme: 'Apóstolos', words: ['PEDRO', 'PAULO', 'JOAO', 'TIAGO', 'MATEUS', 'ANDRE'] },
  { theme: 'Frutos do Espírito', words: ['AMOR', 'PAZ', 'GOZO', 'FE', 'BONDADE'] },
  { theme: 'Livros do AT', words: ['GENESIS', 'EXODO', 'SALMOS', 'ISAIAS', 'DANIEL'] },
];

function generateGrid(words: string[], size: number = 10): { grid: string[][]; placements: { word: string; row: number; col: number; dir: string }[] } {
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placements: { word: string; row: number; col: number; dir: string }[] = [];
  const directions = [
    [0, 1], [1, 0], [1, 1], // right, down, diagonal
  ];

  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      if (row + dir[0] * word.length > size || col + dir[1] * word.length > size) continue;
      let fits = true;
      for (let k = 0; k < word.length; k++) {
        const r = row + dir[0] * k, c = col + dir[1] * k;
        if (grid[r][c] && grid[r][c] !== word[k]) { fits = false; break; }
      }
      if (fits) {
        for (let k = 0; k < word.length; k++) {
          grid[row + dir[0] * k][col + dir[1] * k] = word[k];
        }
        placements.push({ word, row, col, dir: `${dir[0]},${dir[1]}` });
        placed = true;
      }
    }
  }
  // Fill empty cells
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  return { grid, placements };
}

export default function GamesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const [activeGame, setActiveGame] = useState<'menu' | 'truefalse' | 'complete' | 'hangman' | 'wordsearch'>('menu');

  useEffect(() => {
    setPageTitle('Jogos Bíblicos');
    seedOfflineData();
  }, [setPageTitle]);

  const persistAttempt = useCallback(async (attempt: {
    userId: string;
    userName: string;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: string;
  }) => {
    try {
      const response = await fetch('/api/quiz/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attempt),
      });

      if (!response.ok) throw new Error();
    } catch {
      await db.quizAttempts.add(attempt);
    }
  }, []);

  // ===== TRUE/FALSE STATE =====
  const [tfQuestions, setTfQuestions] = useState<typeof TRUE_FALSE_QUESTIONS>([]);
  const [tfIndex, setTfIndex] = useState(0);
  const [tfScore, setTfScore] = useState(0);
  const [tfAnswered, setTfAnswered] = useState(false);
  const [tfCorrect, setTfCorrect] = useState(false);

  const startTrueFalse = () => {
    setTfQuestions([...TRUE_FALSE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 8));
    setTfIndex(0); setTfScore(0); setTfAnswered(false);
    setActiveGame('truefalse');
  };

  const handleTfAnswer = (answer: boolean) => {
    if (tfAnswered) return;
    const correct = answer === tfQuestions[tfIndex].answer;
    setTfCorrect(correct);
    if (correct) setTfScore(s => s + 15);
    setTfAnswered(true);
  };

  const nextTf = async () => {
    if (tfIndex + 1 >= tfQuestions.length) {
      if (user?.email) await persistAttempt({
        userId: user.email,
        userName: user.name || 'Jogador',
        score: tfScore,
        totalQuestions: tfQuestions.length,
        correctAnswers: Math.round(tfScore / 15),
        completedAt: new Date().toISOString()
      });
      toast.success(`V ou F concluído! ${tfScore} pontos`);
      setActiveGame('menu');
      return;
    }
    setTfIndex(i => i + 1); setTfAnswered(false);
  };

  // ===== COMPLETE VERSE STATE =====
  const [cvQuestions, setCvQuestions] = useState<typeof COMPLETE_VERSE_DATA>([]);
  const [cvIndex, setCvIndex] = useState(0);
  const [cvInput, setCvInput] = useState('');
  const [cvScore, setCvScore] = useState(0);
  const [cvAnswered, setCvAnswered] = useState(false);
  const [cvCorrect, setCvCorrect] = useState(false);

  const startCompleteVerse = () => {
    setCvQuestions([...COMPLETE_VERSE_DATA].sort(() => Math.random() - 0.5).slice(0, 6));
    setCvIndex(0); setCvInput(''); setCvScore(0); setCvAnswered(false);
    setActiveGame('complete');
  };

  const handleCvAnswer = () => {
    if (cvAnswered) return;
    const correct = cvInput.trim().toLowerCase() === cvQuestions[cvIndex].answer.toLowerCase();
    setCvCorrect(correct);
    if (correct) setCvScore(s => s + 20);
    setCvAnswered(true);
  };

  const nextCv = async () => {
    if (cvIndex + 1 >= cvQuestions.length) {
      if (user?.email) await persistAttempt({ 
        userId: user.email, 
        userName: user.name || 'Jogador', 
        score: cvScore, 
        totalQuestions: cvQuestions.length, 
        correctAnswers: Math.round(cvScore / 20), 
        completedAt: new Date().toISOString() 
      });
      toast.success(`Complete o Versículo concluído! ${cvScore} pontos`);
      setActiveGame('menu');
      return;
    }
    setCvIndex(i => i + 1); setCvInput(''); setCvAnswered(false);
  };

  // ===== HANGMAN STATE =====
  const [hmWord, setHmWord] = useState<typeof HANGMAN_WORDS[0] | null>(null);
  const [hmGuessed, setHmGuessed] = useState<Set<string>>(new Set());
  const [hmErrors, setHmErrors] = useState(0);
  const MAX_ERRORS = 6;

  const startHangman = useCallback(() => {
    const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
    setHmWord(word); setHmGuessed(new Set()); setHmErrors(0);
    setActiveGame('hangman');
  }, []);

  const handleHmGuess = async (letter: string) => {
    if (!hmWord || hmGuessed.has(letter)) return;
    const newGuessed = new Set(hmGuessed);
    newGuessed.add(letter);
    setHmGuessed(newGuessed);
    const normalizedWord = hmWord.word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!normalizedWord.includes(letter)) {
      const newErrors = hmErrors + 1;
      setHmErrors(newErrors);
      if (newErrors >= MAX_ERRORS) {
        toast.error(`Você perdeu! A palavra era: ${hmWord.word}`);
        setActiveGame('menu');
      }
    } else {
      const allRevealed = hmWord.word.split('').every(c => {
        if (c === ' ' || c === '-') return true;
        const norm = c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return newGuessed.has(norm);
      });
      if (allRevealed) {
        const points = Math.max(10, 30 - hmErrors * 5);
        if (user?.email) await persistAttempt({ 
          userId: user.email, 
          userName: user.name || 'Jogador', 
          score: points, 
          totalQuestions: 1, 
          correctAnswers: 1, 
          completedAt: new Date().toISOString() 
        });
        toast.success(`Acertou! +${points} pontos`);
        setActiveGame('menu');
      }
    }
  };

  // ===== WORD SEARCH STATE =====
  const [wsSet, setWsSet] = useState<typeof WORD_SEARCH_SETS[0] | null>(null);
  const [wsGrid, setWsGrid] = useState<string[][]>([]);
  const [wsFound, setWsFound] = useState<Set<string>>(new Set());
  const [wsSelected, setWsSelected] = useState<Set<string>>(new Set());

  const startWordSearch = useCallback(() => {
    const set = WORD_SEARCH_SETS[Math.floor(Math.random() * WORD_SEARCH_SETS.length)];
    const { grid } = generateGrid(set.words);
    setWsSet(set); setWsGrid(grid); setWsFound(new Set()); setWsSelected(new Set());
    setActiveGame('wordsearch');
  }, []);

  const handleWsCell = async (r: number, c: number) => {
    if (!wsSet) return;
    const key = `${r},${c}`;
    const newSelected = new Set(wsSelected);
    if (newSelected.has(key)) newSelected.delete(key); else newSelected.add(key);
    setWsSelected(newSelected);

    // Check if selected cells form a word
    const selectedLetters = Array.from(newSelected).sort().map(k => {
      const [row, col] = k.split(',').map(Number);
      return wsGrid[row][col];
    }).join('');

    for (const word of wsSet.words) {
      if (!wsFound.has(word) && (selectedLetters === word || selectedLetters === word.split('').reverse().join(''))) {
        const newFound = new Set(wsFound);
        newFound.add(word);
        setWsFound(newFound);
        setWsSelected(new Set());
        toast.success(`Encontrou: ${word}!`);
        if (newFound.size === wsSet.words.length) {
          const points = 50;
          if (user?.email) await persistAttempt({ 
            userId: user.email, 
            userName: user.name || 'Jogador', 
            score: points, 
            totalQuestions: wsSet.words.length, 
            correctAnswers: wsSet.words.length, 
            completedAt: new Date().toISOString() 
          });
          toast.success(`Caça-palavras completo! +${points} pontos`);
          setTimeout(() => setActiveGame('menu'), 1500);
        }
        return;
      }
    }
  };

  const GAME_LIST = [
    { id: 'quiz', name: 'Quiz Bíblico', icon: Trophy, color: 'text-yellow-500', desc: 'Perguntas, ranking e recordes', start: () => router.push('/quiz') },
    { id: 'truefalse', name: 'Verdadeiro ou Falso', icon: CheckCircle2, color: 'text-green-500', desc: 'Afirmações bíblicas', start: startTrueFalse },
    { id: 'complete', name: 'Complete o Versículo', icon: Type, color: 'text-blue-500', desc: 'Preencha a palavra', start: startCompleteVerse },
    { id: 'hangman', name: 'Jogo da Forca', icon: Gamepad2, color: 'text-purple-500', desc: 'Adivinhe a palavra', start: startHangman },
    { id: 'wordsearch', name: 'Caça-Palavras', icon: Grid3X3, color: 'text-orange-500', desc: 'Encontre palavras', start: startWordSearch },
  ];

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-20">
      <>
        {activeGame === 'menu' && (
          <div key="menu" className="space-y-4 animate-in fade-in duration-300">
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Gamepad2 className="w-7 h-7 text-primary" />
                </div>
                <CardTitle>Jogos Bíblicos</CardTitle>
                <p className="text-muted-foreground text-sm">Aprenda brincando! Pontos contam no ranking geral.</p>
              </CardHeader>
            </Card>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Novo hub de jogos disponível</p>
                  <p className="text-sm text-muted-foreground">A coleção completa migrada do projeto de jogos está em <span className="font-medium text-foreground">/jogos-novos</span>.</p>
                </div>
                <Button onClick={() => router.push('/jogos-novos')} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Abrir Jogos Novos
                </Button>
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              {GAME_LIST.map(g => (
                <Card key={g.id} className="cursor-pointer hover:border-primary/30 transition-all" onClick={g.start}>
                  <CardContent className="pt-5 pb-4 text-center space-y-2">
                    <g.icon className={cn('w-8 h-8 mx-auto', g.color)} />
                    <h3 className="font-semibold text-sm">{g.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{g.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TRUE/FALSE */}
        {activeGame === 'truefalse' && tfQuestions.length > 0 && (
          <div key="tf" className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <Badge variant="secondary">{tfIndex + 1}/{tfQuestions.length}</Badge>
              <Badge><Star className="w-3 h-3 mr-1" />{tfScore} pts</Badge>
            </div>
            <Progress value={((tfIndex + 1) / tfQuestions.length) * 100} className="h-2" />
            <Card>
              <CardContent className="pt-6 space-y-4">
                <h3 className="text-lg font-semibold text-center">"{tfQuestions[tfIndex].statement}"</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button size="lg" variant={tfAnswered && tfQuestions[tfIndex].answer ? 'default' : 'outline'}
                    className={cn(tfAnswered && !tfQuestions[tfIndex].answer && 'border-destructive')}
                    onClick={() => handleTfAnswer(true)} disabled={tfAnswered}>
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Verdadeiro
                  </Button>
                  <Button size="lg" variant={tfAnswered && !tfQuestions[tfIndex].answer ? 'default' : 'outline'}
                    className={cn(tfAnswered && tfQuestions[tfIndex].answer && 'border-destructive')}
                    onClick={() => handleTfAnswer(false)} disabled={tfAnswered}>
                    <XCircle className="w-5 h-5 mr-2" /> Falso
                  </Button>
                </div>
                {tfAnswered && (
                  <div className="space-y-2">
                    <p className={cn('text-sm font-medium', tfCorrect ? 'text-green-500' : 'text-destructive')}>
                      {tfCorrect ? '✅ Correto!' : '❌ Errado!'}
                    </p>
                    <p className="text-xs text-muted-foreground">{tfQuestions[tfIndex].explanation}</p>
                    <Button className="w-full" onClick={nextTf}>{tfIndex + 1 >= tfQuestions.length ? 'Finalizar' : 'Próxima →'}</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame('menu')}>← Voltar</Button>
          </div>
        )}

        {/* COMPLETE VERSE */}
        {activeGame === 'complete' && cvQuestions.length > 0 && (
          <div key="cv" className="space-y-4 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <Badge variant="secondary">{cvIndex + 1}/{cvQuestions.length}</Badge>
              <Badge><Star className="w-3 h-3 mr-1" />{cvScore} pts</Badge>
            </div>
            <Progress value={((cvIndex + 1) / cvQuestions.length) * 100} className="h-2" />
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-xs text-muted-foreground">{cvQuestions[cvIndex].reference}</p>
                <h3 className="text-lg font-semibold italic">"{cvQuestions[cvIndex].verse}"</h3>
                <div className="flex gap-2">
                  <Input value={cvInput} onChange={e => setCvInput(e.target.value)} placeholder="Digite a palavra..."
                    disabled={cvAnswered} onKeyDown={e => e.key === 'Enter' && handleCvAnswer()} />
                  {!cvAnswered && <Button onClick={handleCvAnswer}>Verificar</Button>}
                </div>
                {cvAnswered && (
                  <div className="space-y-2">
                    <p className={cn('text-sm font-medium', cvCorrect ? 'text-green-500' : 'text-destructive')}>
                      {cvCorrect ? '✅ Correto!' : `❌ Resposta: "${cvQuestions[cvIndex].answer}"`}
                    </p>
                    <Button className="w-full" onClick={nextCv}>{cvIndex + 1 >= cvQuestions.length ? 'Finalizar' : 'Próxima →'}</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame('menu')}>← Voltar</Button>
          </div>
        )}

        {/* HANGMAN */}
        {activeGame === 'hangman' && hmWord && (
          <div key="hm" className="space-y-4 animate-in fade-in duration-300">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">{hmWord.category}</Badge>
                  <Badge variant={hmErrors >= 4 ? 'destructive' : 'secondary'}>{hmErrors}/{MAX_ERRORS} erros</Badge>
                </div>
                <p className="text-sm text-muted-foreground text-center">Dica: {hmWord.hint}</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {hmWord.word.split('').map((char, i) => {
                    if (char === ' ') return <span key={i} className="w-4" />;
                    const normalizedChar = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    const revealed = hmGuessed.has(normalizedChar);
                    return (
                      <div key={i} className={cn('w-8 h-10 border-b-2 flex items-center justify-center text-lg font-bold',
                        revealed ? 'border-primary text-foreground' : 'border-muted-foreground')}>
                        {revealed ? char : ''}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letter => (
                    <Button key={letter} size="sm" variant={hmGuessed.has(letter) ? 'secondary' : 'outline'}
                      className="w-8 h-8 p-0 text-xs" disabled={hmGuessed.has(letter)}
                      onClick={() => handleHmGuess(letter)}>
                      {letter}
                    </Button>
                  ))}
                </div>
                <Progress value={(hmErrors / MAX_ERRORS) * 100} className="h-2" />
              </CardContent>
            </Card>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame('menu')}>← Voltar</Button>
          </div>
        )}

        {/* WORD SEARCH */}
        {activeGame === 'wordsearch' && wsSet && (
          <div key="ws" className="space-y-4 animate-in fade-in duration-300">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm">Tema: {wsSet.theme}</h3>
                  <Badge>{wsFound.size}/{wsSet.words.length}</Badge>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {wsSet.words.map(w => (
                    <Badge key={w} variant={wsFound.has(w) ? 'default' : 'outline'} className={cn('text-xs', wsFound.has(w) && 'line-through')}>
                      {w}
                    </Badge>
                  ))}
                </div>
                <div className="grid gap-0.5 mx-auto" style={{ gridTemplateColumns: `repeat(${wsGrid[0]?.length || 10}, 1fr)`, maxWidth: '320px' }}>
                  {wsGrid.map((row, r) => row.map((cell, c) => (
                    <button key={`${r}-${c}`}
                      className={cn('w-full aspect-square flex items-center justify-center text-xs font-bold rounded transition-all',
                        wsSelected.has(`${r},${c}`) ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted')}
                      onClick={() => handleWsCell(r, c)}>
                      {cell}
                    </button>
                  )))}
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setWsSelected(new Set())}>Limpar seleção</Button>
              </CardContent>
            </Card>
            <Button variant="ghost" size="sm" onClick={() => setActiveGame('menu')}>← Voltar</Button>
          </div>
        )}
      </>
    </div>
  );
}
