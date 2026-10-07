"use client";

import { useEffect, useRef } from "react";

let winnerAudio: HTMLAudioElement | null = null;
let audioUnlocked = false;
let pendingWinnerSound = false;

function getWinnerAudio() {
  winnerAudio ??= new Audio("/winner.mp3");
  winnerAudio.preload = "auto";
  winnerAudio.volume = 0.3;
  return winnerAudio;
}

function playWinnerSound() {
  const audio = getWinnerAudio();
  audio.currentTime = 0;
  void audio.play().catch(() => {
    // O navegador pode exigir uma interação antes de liberar áudio.
    pendingWinnerSound = true;
  });
}

function unlockWinnerAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  const audio = getWinnerAudio();
  audio.muted = true;
  void audio.play().then(() => {
    audio.pause();
    audio.currentTime = 0;
    audio.muted = false;
    if (pendingWinnerSound) {
      pendingWinnerSound = false;
      playWinnerSound();
    }
  }).catch(() => {
    audio.muted = false;
    audioUnlocked = false;
  });
}

/** Reproduz o som de vitória uma única vez por conclusão da partida. */
export function useWinnerSound(hasWon: boolean) {
  const playedRef = useRef(false);

  useEffect(() => {
    window.addEventListener("pointerdown", unlockWinnerAudio, { once: true, passive: true });
    window.addEventListener("keydown", unlockWinnerAudio, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlockWinnerAudio);
      window.removeEventListener("keydown", unlockWinnerAudio);
    };
  }, []);

  useEffect(() => {
    if (!hasWon) {
      playedRef.current = false;
      return;
    }

    if (playedRef.current) return;
    playedRef.current = true;

    playWinnerSound();
  }, [hasWon]);
}
