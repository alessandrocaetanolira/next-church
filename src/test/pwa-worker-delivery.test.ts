// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ buildId: 'build-current' }));
vi.mock('node:fs', () => ({ readFileSync: () => runtime.buildId }));
vi.mock('@serwist/turbopack', () => ({ createSerwistRoute: () => ({
  dynamic: 'force-static', dynamicParams: false, revalidate: false,
  generateStaticParams: vi.fn(), GET: async () => new Response('worker', { headers: { 'Content-Type': 'application/javascript', 'Service-Worker-Allowed': '/' } }),
}) }));
import { getPwaWorkerUrl } from '@/lib/server/pwa-build';
import { GET } from '@/app/serwist/[path]/route';

describe('entrega do Service Worker', () => {
  it('troca URL por build mantendo o caminho e o registro Serwist', () => {
    runtime.buildId = 'build-current';
    expect(getPwaWorkerUrl()).toBe('/serwist/sw.js?build=build-current');
    runtime.buildId = 'build-new';
    expect(getPwaWorkerUrl()).toBe('/serwist/sw.js?build=build-new');
  });
  it('mantém artefato gerado com scope raiz e desabilita cache de CDN', async () => {
    const response = await GET(new Request('https://church.local/serwist/sw.js'), { params: Promise.resolve({ path: 'sw.js' }) });
    expect(await response.text()).toBe('worker');
    expect(response.headers.get('Service-Worker-Allowed')).toBe('/');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('Cloudflare-CDN-Cache-Control')).toBe('no-store');
    expect(response.headers.get('CDN-Cache-Control')).toBe('no-store');
  });
});
