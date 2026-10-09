/** Limita esperas do navegador/rede e descarta resultados após cancelamento. */
export function pushStep<T>(promise: PromiseLike<T>, signal: AbortSignal, message: string, timeoutMs = 12_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', onAbort); };
    const onAbort = () => { cleanup(); reject(new Error('Operação cancelada.')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error(message)); }, timeoutMs);
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) { onAbort(); return; }
    Promise.resolve(promise).then(
      (value) => { cleanup(); resolve(value); },
      (error: unknown) => { cleanup(); reject(error); },
    );
  });
}

export function pushSupportIssue(): string | null {
  if (typeof window === 'undefined') return 'Verificando disponibilidade.';
  if (!window.isSecureContext) return 'Notificações exigem uma conexão segura.';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  if (ios && !standalone) return 'Adicione o app à Tela de Início e abra pelo ícone para ativar notificações.';
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'Este navegador não oferece notificações Push.';
  }
  return null;
}

export function readyPushWorker(signal: AbortSignal) {
  return pushStep(navigator.serviceWorker.ready, signal,
    'Não foi possível preparar as notificações. Tente novamente em instantes.', 8_000);
}

export function decodeVapidKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const decoded = window.atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}
