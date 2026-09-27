'use client';

let audioContext: AudioContext | null = null;
const recentlyPlayed = new Map<string, number>();

/**
 * Beep curto para eventos de notificação em primeiro plano.
 * O som é sintetizado no navegador para não depender de um arquivo externo.
 */
export function playNotificationBeep(key = 'notification') {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const lastPlayedAt = recentlyPlayed.get(key) ?? 0;
  if (now - lastPlayedAt < 1_500) return;
  recentlyPlayed.set(key, now);

  if ('vibrate' in navigator) navigator.vibrate([35, 25, 45]);

  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!AudioContextCtor) return;

    audioContext ??= new AudioContextCtor();
    const context = audioContext;
    void context.resume().catch(() => undefined);

    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, context.currentTime);
    master.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.018);
    master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    master.connect(context.destination);

    const firstTone = context.createOscillator();
    firstTone.type = 'sine';
    firstTone.frequency.setValueAtTime(740, context.currentTime);
    firstTone.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.08);
    firstTone.connect(master);

    const secondTone = context.createOscillator();
    secondTone.type = 'triangle';
    secondTone.frequency.setValueAtTime(988, context.currentTime + 0.09);
    secondTone.frequency.exponentialRampToValueAtTime(1175, context.currentTime + 0.2);
    secondTone.connect(master);

    firstTone.start(context.currentTime);
    firstTone.stop(context.currentTime + 0.1);
    secondTone.start(context.currentTime + 0.09);
    secondTone.stop(context.currentTime + 0.24);

    window.setTimeout(() => master.disconnect(), 350);
  } catch {
    // Som é opcional e pode ser bloqueado pelo navegador até uma interação.
  }
}
