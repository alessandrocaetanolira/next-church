import { createHash } from 'node:crypto';

type Entry = { url: string; revision?: string | null; integrity?: string; size: number };
const DOCUMENTS = ['/pwa-start', '/bible', '/offline'];

/** Vincula documentos do shell aos assets gerados pelo mesmo build.
 * Sem revisão, Serwist reutiliza HTML anterior na instalação e remove seus
 * chunks na ativação, impedindo hidratação quando não há rede.
 */
export function revisionOfflineDocuments(entries: Entry[]) {
  const assets = entries.filter((entry) => !DOCUMENTS.includes(entry.url));
  const revision = createHash('sha256')
    .update(JSON.stringify(assets.map(({ url, revision, size }) => [url, revision, size])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))))
    .digest('hex');
  return {
    manifest: [...assets, ...DOCUMENTS.map((url) => ({ url, revision, size: 0 }))],
  };
}
