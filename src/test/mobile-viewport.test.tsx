import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveMobileViewportHeight, useMobileViewport } from '@/hooks/use-mobile-viewport';

let viewport: EventTarget & { height: number };
const height = () => document.documentElement.style.getPropertyValue('--app-viewport-height');
const setHeight = (value: number) => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, value });
  viewport.height = value;
};
beforeEach(() => {
  vi.useFakeTimers();
  viewport = Object.assign(new EventTarget(), { height: 850 });
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  setHeight(850);
  window.localStorage.clear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); document.body.innerHTML = ''; });

describe('viewport mobile ao retornar', () => {
  it('ignora medidas enquanto oculto e aceita nova altura menor sem confundir com teclado', async () => {
    renderHook(() => useMobileViewport(true));
    await act(() => vi.advanceTimersByTimeAsync(650));
    expect(height()).toBe('850px');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    setHeight(300); fireEvent(document, new Event('visibilitychange'));
    await act(() => vi.advanceTimersByTimeAsync(650));
    expect(height()).toBe('850px');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    setHeight(650); fireEvent(document, new Event('visibilitychange'));
    await act(() => vi.advanceTimersByTimeAsync(650));
    expect(height()).toBe('650px');
  });

  it('preserva altura com teclado e campo focado, depois reconcilia orientação e limpa ao desmontar', async () => {
    const view = renderHook(() => useMobileViewport(true));
    await act(() => vi.advanceTimersByTimeAsync(650));
    const input = document.createElement('input'); document.body.appendChild(input); input.focus();
    setHeight(500); viewport.dispatchEvent(new Event('resize'));
    await act(() => vi.advanceTimersByTimeAsync(50));
    expect(height()).toBe('850px');
    // Orientation establishes a new reference even if the editor kept focus.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 700 });
    setHeight(700); fireEvent(window, new Event('orientationchange'));
    await act(() => vi.advanceTimersByTimeAsync(650));
    expect(height()).toBe('700px');
    view.unmount(); expect(height()).toBe('');
  });

  it('rejeita dimensões transitórias inválidas', () => {
    expect(resolveMobileViewportHeight({ layoutHeight: 0, visualHeight: 0, previousHeight: 850, editing: false })).toBe(850);
  });
});
