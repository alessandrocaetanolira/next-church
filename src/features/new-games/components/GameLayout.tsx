"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface GameLayoutProps {
  title: string;
  emoji: string;
  children: React.ReactNode;
}

const GameLayout = ({ title, emoji, children }: GameLayoutProps) => {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => router.push("/jogos-novos")} className="rounded-lg p-2 transition-colors hover:bg-secondary">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <span className="text-2xl">{emoji}</span>
        <h1 className="font-display truncate text-lg font-bold text-foreground">{title}</h1>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 p-4">{children}</main>
    </div>
  );
};

export default GameLayout;
