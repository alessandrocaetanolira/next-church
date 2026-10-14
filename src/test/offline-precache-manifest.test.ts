// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { revisionOfflineDocuments } from '@/lib/pwa/precache-manifest';

describe('documentos offline vinculados ao build', () => {
  const assets = [{ url: '/_next/static/chunks/abc.js', revision: null, size: 100 }];
  it('inclui entrada real do PWA, Bíblia e fallback com revisão não vazia', () => {
    const { manifest } = revisionOfflineDocuments(assets);
    for (const url of ['/pwa-start', '/bible', '/offline']) {
      expect(manifest.find((entry) => entry.url === url)?.revision).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(manifest[0]).toEqual(assets[0]);
  });
  it('invalida documentos quando os chunks mudam, mesmo sem mudar o worker fonte', () => {
    const old = revisionOfflineDocuments(assets).manifest.at(-1)?.revision;
    const next = revisionOfflineDocuments([{ ...assets[0], url: '/_next/static/chunks/new.js' }]).manifest.at(-1)?.revision;
    expect(next).not.toBe(old);
  });
  it('é determinístico e substitui documentos existentes sem duplicar', () => {
    const extra = { url: '/icon.png', revision: 'icon-version', size: 20 };
    const first = revisionOfflineDocuments([...assets, extra, { url: '/offline', size: 0 }]);
    const second = revisionOfflineDocuments([extra, ...assets]);
    expect(first.manifest.at(-1)?.revision).toBe(second.manifest.at(-1)?.revision);
    expect(first.manifest.filter((entry) => entry.url === '/offline')).toHaveLength(1);
  });
});
