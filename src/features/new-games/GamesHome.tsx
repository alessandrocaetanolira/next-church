"use client";

import { useRouter } from "next/navigation";
import { gamesCatalog } from "@/features/new-games/catalog";

export function GamesHome() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 pb-4 pt-8 text-center">
        <div className="mb-2 text-5xl">✝️</div>
        <h1 className="font-display text-3xl font-bold text-foreground">Jogos Bíblicos</h1>
        <p className="mt-1 text-muted-foreground">Aprenda e divirta-se com a Palavra</p>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {gamesCatalog.map((game, index) => (
            <button
              key={game.id}
              onClick={() => router.push(`/jogos-novos/${game.id}`)}
              className="game-card animate-fade-in flex flex-col gap-2 text-left"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: "both" }}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${game.color} text-xl`}>
                {game.emoji}
              </div>
              <h2 className="font-display text-sm font-bold leading-tight text-foreground">{game.name}</h2>
              <p className="text-xs leading-snug text-muted-foreground">{game.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
