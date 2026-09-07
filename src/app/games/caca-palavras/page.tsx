/**
 * app/games/caca-palavras/page.tsx
 * 
 * Página do jogo Caça-Palavras.
 */

import type { Viewport } from "next";
import { WordSearch } from "@/features/games/components/WordSearch";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function CacaPalavrasPage() {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden overscroll-none bg-background">
      <div className="h-full overflow-hidden py-4">
        <WordSearch />
      </div>
    </div>
  );
}
