import { notFound } from "next/navigation";
import { GameRenderer } from "@/features/new-games/GameRenderer";
import { MemoryGameEntry } from "@/features/game-challenges/MemoryGameEntry";
import { gamesCatalog, type NewGameId } from "@/features/new-games/catalog";

export default async function JogoNovoDetalhePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ challenge?: string }> }) {
  const { slug } = await params;
  const { challenge } = await searchParams;
  const gameId = slug as NewGameId;
  if (!gamesCatalog.some((game) => game.id === gameId)) {
    notFound();
  }

  return gameId === 'memoria' ? <MemoryGameEntry initialChallengeId={challenge ?? null} /> : <GameRenderer gameId={gameId} />;
}
