'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useWinnerSound } from '@/features/new-games/hooks/use-winner-sound';

type CardState = { id: string; revealed: boolean; matched: boolean };

function createBoard(): CardState[] {
  return Array.from({ length: 16 }, (_, index) => ({ id: `pair-${index % 8}`, revealed: false, matched: false }))
    .sort(() => Math.random() - 0.5);
}

export function MemoryCpu() {
  const initial = useMemo(createBoard, []);
  const [cards, setCards] = useState<CardState[]>(initial);
  const [selected, setSelected] = useState<number[]>([]);
  const [turn, setTurn] = useState<'player' | 'cpu'>('player');
  const [scores, setScores] = useState({ player: 0, cpu: 0 });
  const [busy, setBusy] = useState(false);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  useWinnerSound(cards.every((card) => card.matched) && scores.player > scores.cpu);

  const reset = () => { setCards(createBoard()); setSelected([]); setTurn('player'); setScores({ player: 0, cpu: 0 }); setBusy(false); };

  const finishPair = (first: number, second: number) => {
    const match = cards[first].id === cards[second].id;
    setCards((current) => current.map((card, index) => index === first || index === second ? { ...card, revealed: match ? true : false, matched: match || card.matched } : card));
    if (match) {
      setScores((current) => ({ ...current, [turn]: current[turn] + 1 }));
      setSelected([]);
      if (cards.every((card, index) => card.matched || index === first || index === second)) {
        const next = { ...scores, [turn]: scores[turn] + 1 };
        toast.success(next.player === next.cpu ? 'Empate!' : next.player > next.cpu ? 'Você venceu!' : 'A CPU venceu!');
      }
      if (turn === 'cpu') window.setTimeout(() => cpuTurn(), 500);
      return;
    }
    window.setTimeout(() => { setSelected([]); setTurn(turn === 'player' ? 'cpu' : 'player'); }, 700);
  };

  const choose = (index: number) => {
    if (turn !== 'player' || busy || cards[index].matched || selected.includes(index)) return;
    const next = [...selected, index];
    setSelected(next);
    setCards((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, revealed: true } : card));
    if (next.length === 2) { setBusy(true); window.setTimeout(() => { finishPair(next[0], next[1]); setBusy(false); }, 450); }
  };

  const cpuTurn = () => {
    const available = cardsRef.current.map((card, index) => ({ card, index })).filter(({ card }) => !card.matched);
    if (available.length < 2) return;
    const first = available[Math.floor(Math.random() * available.length)].index;
    const secondOptions = available.filter(({ index }) => index !== first);
    const second = secondOptions[Math.floor(Math.random() * secondOptions.length)].index;
    setCards((current) => current.map((card, index) => index === first || index === second ? { ...card, revealed: true } : card));
    setBusy(true);
    window.setTimeout(() => { finishPair(first, second); setBusy(false); }, 650);
  };

  return <Card className="mx-auto max-w-lg"><CardHeader><CardTitle>Memory contra CPU</CardTitle><p className="text-sm text-muted-foreground">Sua vez: {turn === 'player' ? 'escolha duas cartas' : 'a CPU está jogando'}</p></CardHeader><CardContent className="space-y-4"><div className="flex justify-between text-sm"><span>Você: {scores.player}</span><span>CPU: {scores.cpu}</span></div><div className="grid grid-cols-4 gap-2">{cards.map((card, index) => <Button key={index} variant={card.revealed || card.matched ? 'default' : 'outline'} className="aspect-square p-0 text-sm" disabled={turn !== 'player' || busy || card.matched} onClick={() => choose(index)}>{card.revealed || card.matched ? card.id.replace('pair-', '') : '?'}</Button>)}</div><Button variant="outline" className="w-full" onClick={reset}>Reiniciar</Button></CardContent></Card>;
}
