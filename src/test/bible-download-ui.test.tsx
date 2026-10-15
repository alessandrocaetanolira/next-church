import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { db, type OfflineBibleDownload } from '@/lib/db';
import type { BibleTranslation } from '@/features/bible/api/bible.api';
import { BibleDownloadControl } from '@/features/bible/components/BibleDownloadControl';
import { BibleTranslationsDrawer } from '@/features/bible/components/BibleTranslationsDrawer';
import { useBibleReadingStore } from '@/features/bible/store';

const runtime = vi.hoisted(() => ({ download: vi.fn(), pause: vi.fn(), remove: vi.fn(), success: vi.fn(), info: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: runtime.success, info: runtime.info, error: runtime.error } }));
vi.mock('@/features/bible/api/bible.api', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/bible/api/bible.api')>(),
  downloadBibleTranslation: runtime.download, pauseBibleDownload: runtime.pause, removeBibleDownload: runtime.remove,
}));
vi.mock('@/components/ui/drawer', () => ({
  DrawerHeader: ({ children, ...props }: { children: ReactNode }) => <header {...props}>{children}</header>,
  DrawerTitle: ({ children, ...props }: { children: ReactNode }) => <h2 {...props}>{children}</h2>,
  DrawerDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
function record(changes: Partial<OfflineBibleDownload> = {}): OfflineBibleDownload {
  return { translation: 'NVI', status: 'ready', downloadedChapters: 100, totalChapters: 100,
    updatedAt: new Date().toISOString(), contentVersion: 'shared-bible-v1', ...changes };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(async () => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  await db.offlineBibleDownloads.clear(); await db.offlineBibleChapters.clear();
  await db.bibleFavorites.clear(); await db.bibleAnnotations.clear();
  useBibleReadingStore.setState({ translation: 'NVI' });
  runtime.download.mockImplementation(async (translation: BibleTranslation) => {
    const ready = record({ translation }); await db.offlineBibleDownloads.put(ready); return ready;
  });
  runtime.pause.mockImplementation(async (translation: BibleTranslation) => {
    const paused = record({ translation, status: 'paused', downloadedChapters: 20 });
    await db.offlineBibleDownloads.put(paused); return paused;
  });
  runtime.remove.mockImplementation(async (translation: BibleTranslation) => {
    await db.offlineBibleChapters.where('translation').equals(translation).delete();
    await db.offlineBibleDownloads.delete(translation);
  });
});
afterEach(() => { cleanup(); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });

describe('drawer de versões e downloads da Bíblia', () => {
  it('identifica as três versões e reage à troca de seleção sem reabrir', async () => {
    render(<BibleTranslationsDrawer onSelect={(translation) => useBibleReadingStore.getState().setTranslation(translation)} />);
    expect(screen.getByText('Nova Versão Internacional')).toBeDefined();
    expect(screen.getByText('Almeida Corrigida Fiel')).toBeDefined();
    expect(screen.getByText('Almeida Atualizada')).toBeDefined();
    const nvi = within(screen.getByRole('article', { name: 'Versão NVI' }));
    const aa = within(screen.getByRole('article', { name: 'Versão AA' }));
    expect(nvi.getByText('Em uso')).toBeDefined();
    fireEvent.click(aa.getByRole('button', { name: 'Usar versão AA para leitura' }));
    expect(aa.getByText('Em uso')).toBeDefined();
    expect(nvi.queryByText('Em uso')).toBeNull();
    expect(runtime.download).not.toHaveBeenCalled();
    await waitFor(() => expect((aa.getByRole('button', { name: 'Baixar AA' }) as HTMLButtonElement).disabled).toBe(false));
  });

  it('mostra o progresso real do Dexie com o drawer aberto e só conclui com status ready', async () => {
    const finish = deferred<OfflineBibleDownload>();
    runtime.download.mockReturnValueOnce(finish.promise);
    render(<BibleDownloadControl translation="NVI" />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Baixar NVI' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Baixar NVI' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar NVI' }).getAttribute('data-state')).toBe('preparing'));
    await act(async () => { await db.offlineBibleDownloads.put(record({ status: 'downloading', downloadedChapters: 20 })); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Baixando NVI: 20%' }).textContent).toContain('20%'));
    expect(screen.getByText('20 de 100 capítulos')).toBeDefined();
    expect(screen.getByRole('progressbar', { name: 'Progresso do download NVI' }).getAttribute('aria-valuenow')).toBe('20');
    expect(screen.queryByRole('button', { name: 'NVI disponível offline' })).toBeNull();
    await act(async () => { await db.offlineBibleDownloads.put(record()); finish.resolve(record()); });
    await waitFor(() => expect(screen.getByRole('button', { name: 'NVI disponível offline' }).getAttribute('data-state')).toBe('ready'));
    expect(runtime.success).toHaveBeenCalledWith('NVI disponível para leitura offline.');
  });

  it('pausar não emite sucesso de download concluído e permite continuar', async () => {
    const finish = deferred<OfflineBibleDownload>();
    runtime.download.mockImplementationOnce(async () => {
      await db.offlineBibleDownloads.put(record({ status: 'downloading', downloadedChapters: 20 })); return finish.promise;
    });
    render(<BibleDownloadControl translation="NVI" />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Baixar NVI' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Baixar NVI' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pausar download NVI' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Pausar download NVI' }));
    await waitFor(() => expect(screen.getByText('Pausado')).toBeDefined());
    await act(async () => { finish.resolve(record({ status: 'paused', downloadedChapters: 20 })); });
    await waitFor(() => expect((screen.getByRole('button', { name: 'Continuar download NVI' }) as HTMLButtonElement).disabled).toBe(false));
    expect(runtime.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar download NVI' }));
    await waitFor(() => expect(runtime.download).toHaveBeenCalledTimes(2));
  });

  it('solicita confirmação para remover e preserva os dados pessoais e as outras versões', async () => {
    await db.offlineBibleDownloads.put(record());
    for (const translation of ['NVI', 'AA'] as const) await db.offlineBibleChapters.put({ translation, bookAbbrev: 'gn', chapter: 1, verses: ['Texto'], cachedAt: new Date().toISOString(), contentVersion: 'shared-bible-v1' });
    const favorite = { tenantId: 'tenant-a', userId: 'user-a', translation: 'NVI' as const, bookAbbrev: 'gn', bookName: 'Gênesis', testament: 'AT' as const, chapter: 1, verseNumbers: [1], selectionKey: '1', createdAt: new Date().toISOString() };
    await db.bibleFavorites.add(favorite);
    await db.bibleAnnotations.add({ ...favorite, note: 'Minha anotação', updatedAt: favorite.createdAt });
    render(<BibleDownloadControl translation="NVI" />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover NVI offline' })).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Remover NVI offline' }));
    expect(screen.getByText('Remover NVI deste dispositivo?')).toBeDefined();
    expect(runtime.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(runtime.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Remover NVI offline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remover NVI offline' })).toBeNull());
    expect(await db.offlineBibleChapters.get(['NVI', 'gn', 1])).toBeUndefined();
    expect(await db.offlineBibleChapters.get(['AA', 'gn', 1])).toBeDefined();
    expect(await db.bibleFavorites.count()).toBe(1);
    expect(await db.bibleAnnotations.count()).toBe(1);
  });

  it('informa indisponibilidade de rede sem impedir consulta do conteúdo já salvo', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<BibleDownloadControl translation="AA" />);
    await waitFor(() => expect(screen.getByText('Não baixada')).toBeDefined());
    const button = screen.getByRole('button', { name: 'Baixar AA' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/Conecte-se para baixar ou atualizar/)).toBeDefined();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    fireEvent(window, new Event('online'));
    expect(button.disabled).toBe(false);
    expect(runtime.download).not.toHaveBeenCalled();
  });

  it('mantém erro e retry visíveis, sem apagar capítulos para tentar novamente', async () => {
    runtime.download.mockRejectedValueOnce(new Error('Espaço insuficiente no dispositivo.'));
    render(<BibleDownloadControl translation="NVI" />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Baixar NVI' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Baixar NVI' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Espaço insuficiente'));
    expect((screen.getByRole('button', { name: 'Tentar baixar NVI novamente' }) as HTMLButtonElement).disabled).toBe(false);
    expect(runtime.remove).not.toHaveBeenCalled();
  });
});
