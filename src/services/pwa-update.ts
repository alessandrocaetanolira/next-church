/** Atualiza apenas o registro existente. Não apaga cache, IndexedDB ou subscriptions. */
export async function updatePwaWorker() {
  if (!navigator.onLine) throw new Error('Conecte-se à internet para atualizar o app.');
  if (!('serviceWorker' in navigator)) throw new Error('Atualização indisponível neste navegador.');
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (!registration) throw new Error('O app ainda está preparando a atualização. Tente novamente.');
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Não foi possível buscar a atualização. Verifique sua conexão.')), 30_000);
    registration.update().then(
      () => { clearTimeout(timeout); resolve(); },
      (error: unknown) => { clearTimeout(timeout); reject(error); },
    );
  });
  const worker = registration.installing ?? registration.waiting;
  if (!worker || worker.state === 'activated') return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => { clearTimeout(timeout); worker.removeEventListener('statechange', check); };
    const check = () => {
      if (worker.state === 'activated') { cleanup(); resolve(); }
      else if (worker.state === 'redundant') { cleanup(); reject(new Error('Não foi possível instalar a atualização. Tente novamente.')); }
      else if (worker.state === 'installed') worker.postMessage({ type: 'SKIP_WAITING' });
    };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('A atualização não terminou. Verifique sua conexão e tente novamente.')); }, 30_000);
    worker.addEventListener('statechange', check);
    check();
  });
}
