import { notFound } from "next/navigation";
import { GameRenderer } from "@/features/new-games/GameRenderer";
import { gamesCatalog, type NewGameId } from "@/features/new-games/catalog";

export default async function JogoNovoDetalhePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const gameId = slug as NewGameId;
  if (!gamesCatalog.some((game) => game.id === gameId)) {
    notFound();
  }

  return <GameRenderer gameId={gameId} />;
}
