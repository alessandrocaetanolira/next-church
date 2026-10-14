import { readFileSync } from 'node:fs';
import path from 'node:path';

/** URL única por artefato, evitando recuperar sw.js antigo em caches intermediários. */
export function getPwaWorkerUrl() {
  try {
    const buildId = readFileSync(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8').trim();
    if (buildId) return `/serwist/sw.js?build=${encodeURIComponent(buildId)}`;
  } catch { /* O BUILD_ID ainda não existe durante algumas etapas do build. */ }
  return '/serwist/sw.js?build=offline-recovery-v3';
}
