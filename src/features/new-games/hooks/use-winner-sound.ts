"use client";

import { useEffect, useRef } from "react";

/** Reproduz o som de vitória uma única vez por conclusão da partida. */
export function useWinnerSound(hasWon: boolean) {
  const playedRef = useRef(false);

  useEffect(() => {
    if (!hasWon) {
      playedRef.current = false;
      return;
    }

    if (playedRef.current) return;
    playedRef.current = true;

    const audio = new Audio("/winner.mp3");
    audio.volume = 0.3;
    void audio.play().catch(() => {
      // Browsers may block autoplay until a user gesture; the game remains usable.
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [hasWon]);
}
