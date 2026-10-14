import { afterEach, describe, expect, it, vi } from 'vitest';
import { updatePwaWorker } from '@/services/pwa-update';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('atualização do registro PWA existente', () => {
  it('usa update, sem registrar outro worker ou remover dados/subscriptions', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const registration = { update: vi.fn().mockResolvedValue(undefined), installing: null, waiting: null, unregister: vi.fn() };
    const serviceWorker = { getRegistration: vi.fn().mockResolvedValue(registration), register: vi.fn() };
    vi.stubGlobal('navigator', { onLine: true, serviceWorker });
    await updatePwaWorker();
    expect(registration.update).toHaveBeenCalledOnce();
    expect(serviceWorker.register).not.toHaveBeenCalled();
    expect(registration.unregister).not.toHaveBeenCalled();
  });
  it('não consulta o registro quando está offline', async () => {
    const getRegistration = vi.fn();
    vi.stubGlobal('navigator', { onLine: false, serviceWorker: { getRegistration } });
    await expect(updatePwaWorker()).rejects.toThrow('Conecte-se');
    expect(getRegistration).not.toHaveBeenCalled();
  });
  it('aguarda ativação do worker novo antes de concluir', async () => {
    const worker = new EventTarget() as EventTarget & { state: string; postMessage: ReturnType<typeof vi.fn> };
    worker.state = 'installed';
    worker.postMessage = vi.fn(() => { queueMicrotask(() => { worker.state = 'activated'; worker.dispatchEvent(new Event('statechange')); }); });
    const registration = { update: vi.fn().mockResolvedValue(undefined), installing: null, waiting: worker };
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registration) } });
    await updatePwaWorker();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(worker.state).toBe('activated');
  });
  it('não deixa botão travado se a busca da atualização não responde', async () => {
    vi.useFakeTimers();
    const registration = { update: vi.fn(() => new Promise(() => undefined)) };
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: { getRegistration: vi.fn().mockResolvedValue(registration) } });
    const pending = updatePwaWorker();
    const check = expect(pending).rejects.toThrow('Verifique sua conexão');
    await vi.advanceTimersByTimeAsync(30_001);
    await check;
  });
});
