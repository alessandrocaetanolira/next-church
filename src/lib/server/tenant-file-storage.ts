import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const FILES_ROOT = path.resolve(process.cwd(), 'files');
const ALLOWED_MODULES = new Set(['products', 'materials', 'feed', 'branding']);
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function safeSegment(value: string, label: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error(`${label} inválido`);
  return value;
}

export async function saveTenantDataUrl(tenantSlug: string, module: string, dataUrl: string) {
  const safeTenantSlug = safeSegment(tenantSlug, 'Tenant');
  const safeModule = safeSegment(module, 'Módulo');
  if (!ALLOWED_MODULES.has(safeModule)) throw new Error('Módulo de arquivo não permitido');

  const match = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('Imagem inválida');
  const extension = IMAGE_TYPES[match[1]];
  if (!extension) throw new Error('Formato de imagem não permitido');

  const content = Buffer.from(match[2], 'base64');
  if (content.length > 5 * 1024 * 1024) throw new Error('Imagem maior que 5MB');

  const directory = path.join(FILES_ROOT, safeTenantSlug, safeModule);
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(directory, filename), content, { flag: 'wx' });

  return `/api/files/${encodeURIComponent(safeTenantSlug)}/${safeModule}/${filename}`;
}
