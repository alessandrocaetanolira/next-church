type Logo = { source: string; dataUrl: string };
type LogoCache = { version: 1; images: Logo[] };
const MAX_LOGO_BYTES = 512 * 1024;

function key(context: string) { return `church-branding-logos:${encodeURIComponent(context)}`; }

export function readOfflineLogos(context: string): Record<string, string> {
  try {
    const cache = JSON.parse(localStorage.getItem(key(context)) ?? 'null') as LogoCache | null;
    if (cache?.version !== 1 || !Array.isArray(cache.images)) return {};
    return Object.fromEntries(cache.images.filter((image) => typeof image.source === 'string'
      && typeof image.dataUrl === 'string' && /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/.test(image.dataUrl))
      .map(({ source, dataUrl }) => [source, dataUrl]));
  } catch { return {}; }
}

function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não foi possível preservar o logo.'));
    reader.readAsDataURL(blob);
  });
}

/** Cópias pequenas do branding por tenant, sem tocar em Dexie ou APIs de dados. */
export async function preserveOfflineLogos(context: string, sources: string[], signal: AbortSignal) {
  const current = readOfflineLogos(context);
  const result: Record<string, string> = {};
  for (const source of [...new Set(sources)].slice(0, 3)) {
    if (signal.aborted) return current;
    if (current[source]) { result[source] = current[source]; continue; }
    try {
      const url = new URL(source, window.location.origin);
      // Branding autorizado e público do mesmo app, nunca imagens externas ou privadas.
      const localBranding = url.origin === window.location.origin &&
        (url.pathname.startsWith('/branding/') || /^\/api\/files\/[^/]+\/branding\//.test(url.pathname));
      if (!localBranding) continue;
      const response = await fetch(source, { signal, credentials: 'same-origin' });
      if (!response.ok) continue;
      const blob = await response.blob();
      if (blob.size > MAX_LOGO_BYTES || !/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(blob.type)) continue;
      result[source] = await dataUrl(blob);
    } catch {
      if (signal.aborted) return current;
    }
  }
  if (signal.aborted) return current;
  if (Object.keys(result).length) {
    try {
      const cache: LogoCache = { version: 1, images: Object.entries(result).map(([source, dataUrl]) => ({ source, dataUrl })) };
      localStorage.setItem(key(context), JSON.stringify(cache));
    } catch { /* Quota/armazenamento indisponível não podem bloquear o app. */ }
  }
  return result;
}
