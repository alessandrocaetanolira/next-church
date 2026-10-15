import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DownloadProgressButton } from '@/components/shared/DownloadProgressButton';

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('botão compartilhado de download inspirado no exemplo 33', () => {
  it('o progresso depende dos dados recebidos, nunca de uma contagem simulada', async () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    const view = render(<DownloadProgressButton state="downloading" progress={23} onClick={onClick} />);
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('23%');
    expect(button.style.getPropertyValue('--download-progress')).toBe('23%');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    await act(() => vi.advanceTimersByTimeAsync(10_000));
    expect(button.textContent).toContain('23%');
    view.rerender(<DownloadProgressButton state="downloading" progress={100} onClick={onClick} />);
    expect(button.textContent).toContain('100%');
    expect(button.getAttribute('data-state')).toBe('downloading');
    expect(screen.queryByText('Concluído')).toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('faz saída, troca para check e entrada elástica somente ao concluir de verdade', async () => {
    vi.useFakeTimers();
    const view = render(<DownloadProgressButton state="downloading" progress={80} />);
    view.rerender(<DownloadProgressButton state="ready" progress={100} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('data-phase')).toBe('out');
    expect(screen.queryByText('Concluído')).toBeNull();
    await act(() => vi.advanceTimersByTimeAsync(230));
    expect(screen.getByText('Concluído')).toBeDefined();
    expect(button.getAttribute('data-state')).toBe('ready');
    expect(button.getAttribute('data-phase')).toBe('in');
    await act(() => vi.advanceTimersByTimeAsync(720));
    expect(button.getAttribute('data-phase')).toBe('idle');
  });

  it('não repete a comemoração para um arquivo já baixado ao abrir a tela', () => {
    render(<DownloadProgressButton state="ready" progress={100} />);
    expect(screen.getByRole('button').getAttribute('data-phase')).toBe('idle');
  });

  it('permite retomar e tentar novamente, mantendo a porcentagem nos limites', () => {
    const onClick = vi.fn();
    const view = render(<DownloadProgressButton state="paused" progress={140} onClick={onClick} />);
    fireEvent.click(screen.getByText('Continuar'));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button').style.getPropertyValue('--download-progress')).toBe('100%');
    view.rerender(<DownloadProgressButton state="error" progress={-10} onClick={onClick} />);
    expect(screen.getByText('Tentar novamente')).toBeDefined();
    expect(screen.getByRole('button').style.getPropertyValue('--download-progress')).toBe('0%');
  });
});
