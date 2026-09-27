import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';

const FILES_ROOT = path.resolve(process.cwd(), 'files');
const ALLOWED_MODULES = new Set(['products', 'materials', 'feed', 'branding', 'profile']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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
  if (!IMAGE_TYPES.has(match[1])) throw new Error('Formato de imagem não permitido');

  const content = Buffer.from(match[2], 'base64');
  if (content.length > 5 * 1024 * 1024) throw new Error('Imagem maior que 5MB');

  const output = await sharp(content, { limitInputPixels: 40_000_000 })
    .rotate()
    .webp({ quality: 82, alphaQuality: 90 })
    .toBuffer();
  const directory = path.join(FILES_ROOT, safeTenantSlug, safeModule);
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.webp`;
  await writeFile(path.join(directory, filename), output, { flag: 'wx' });

  return `/api/files/${encodeURIComponent(safeTenantSlug)}/${safeModule}/${filename}`;
}

export async function saveTenantImageDataUrl(
  tenantSlug: string,
  module: string,
  dataUrl: string,
  options?: { width?: number; height?: number; format?: 'webp' | 'png' },
) {
  const safeTenantSlug = safeSegment(tenantSlug, 'Tenant');
  const safeModule = safeSegment(module, 'Módulo');
  if (!ALLOWED_MODULES.has(safeModule)) throw new Error('Módulo de arquivo não permitido');

  const match = /^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match || !IMAGE_TYPES.has(match[1])) throw new Error('Imagem inválida');
  const content = Buffer.from(match[2], 'base64');
  if (content.length > 5 * 1024 * 1024) throw new Error('Imagem maior que 5MB');

  let image = sharp(content, { limitInputPixels: 40_000_000 }).rotate();
  if (options?.width && options.height) {
    image = image.resize(options.width, options.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }
  const format = options?.format ?? 'webp';
  const output = format === 'png'
    ? await image.png({ compressionLevel: 9, palette: true }).toBuffer()
    : await image.webp({ quality: 82, alphaQuality: 90 }).toBuffer();
  const directory = path.join(FILES_ROOT, safeTenantSlug, safeModule);
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${format}`;
  await writeFile(path.join(directory, filename), output, { flag: 'wx' });
  return `/api/files/${encodeURIComponent(safeTenantSlug)}/${safeModule}/${filename}`;
}
