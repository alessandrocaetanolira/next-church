'use client';

import { useEffect } from 'react';
import { logMobileResume } from '@/lib/mobile-resume-diagnostics';

/** Freeze the layout only when a focused editor and viewport contraction indicate a keyboard. */
export function resolveMobileViewportHeight(input: {
  layoutHeight: number; visualHeight: number; previousHeight: number; editing: boolean;
}) {
  const { layoutHeight, visualHeight, previousHeight, editing } = input;
  if (layoutHeight <= 0 || visualHeight <= 0) return previousHeight;
  const keyboardOpen = editing && Math.max(previousHeight - layoutHeight, layoutHeight - visualHeight) > 120;
  return keyboardOpen && previousHeight > 0 ? previousHeight : layoutHeight;
}

/** Owns the mobile shell viewport; resume measurements wait for the browser to settle. */
export function useMobileViewport(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const viewport = window.visualViewport;
    let height = window.innerHeight;
    let width = window.innerWidth;
    let frame = 0;
    const timers = new Set<number>();
    const measure = () => {
      frame = 0;
      if (document.visibilityState !== 'visible') return;
      // Rotation is a new layout, even if an editor retained focus while suspended.
      if (window.innerWidth !== width) height = window.innerHeight;
      width = window.innerWidth;
      const active = document.activeElement;
      const editing = active instanceof HTMLTextAreaElement
        || (active instanceof HTMLInputElement && ['text', 'search', 'email', 'tel', 'url', 'password', 'number'].includes(active.type))
        || (active instanceof HTMLElement && active.isContentEditable);
      height = resolveMobileViewportHeight({ layoutHeight: window.innerHeight,
        visualHeight: viewport?.height ?? window.innerHeight, previousHeight: height, editing });
      if (height > 0) document.documentElement.style.setProperty('--app-viewport-height', `${height}px`);
      logMobileResume('viewport-measured');
    };
    const schedule = () => {
      if (document.visibilityState !== 'visible') return;
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measure);
    };
    const settle = () => {
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      if (document.visibilityState !== 'visible') return;
      schedule();
      for (const delay of [100, 300, 600]) {
        const timer = window.setTimeout(() => { timers.delete(timer); schedule(); }, delay);
        timers.add(timer);
      }
    };
    settle();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', settle);
    window.addEventListener('orientationchange', settle);
    window.addEventListener('pageshow', settle);
    window.addEventListener('focus', settle);
    document.addEventListener('visibilitychange', settle);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', settle);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      for (const timer of timers) window.clearTimeout(timer);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', settle);
      window.removeEventListener('orientationchange', settle);
      window.removeEventListener('pageshow', settle);
      window.removeEventListener('focus', settle);
      document.removeEventListener('visibilitychange', settle);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', settle);
      document.documentElement.style.removeProperty('--app-viewport-height');
    };
  }, [enabled]);
}
