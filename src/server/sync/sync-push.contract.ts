import { createHash } from 'node:crypto';
import { ValidationError } from '@/lib/http/errors';

export type SyncPushChange = {
  id: number | string;
  module: 'sales' | 'products' | 'tasks' | 'memberCredits';
  action: 'create' | 'update' | 'delete';
  idempotencyKey: string;
  data: Record<string, unknown>;
  userId?: string;
  tenantId?: string;
  tenantSlug?: string;
};
export type SyncBinding = { tenantId: string; actor: string; memberId: string | null; module: string; action: string; hash: string };

/** Ordenação estável de propriedades; mudar conteúdo/ação não reutiliza um resultado antigo. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
export function syncPayloadHash(data: unknown) { return createHash('sha256').update(canonical(data)).digest('hex'); }

export function parseSyncChange(input: unknown): SyncPushChange {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ValidationError('Operação inválida.');
  const change = input as Record<string, unknown>;
  if (!(typeof change.id === 'number' && Number.isSafeInteger(change.id) && change.id >= 0)
    && !(typeof change.id === 'string' && change.id.length > 0 && change.id.length <= 100)) throw new ValidationError('Identificador da operação inválido.');
  if (typeof change.idempotencyKey !== 'string' || !change.idempotencyKey.trim() || change.idempotencyKey.length > 256) throw new ValidationError('Chave de idempotência obrigatória.');
  const allowed: Record<string, string[]> = { sales: ['create', 'update'], products: ['create', 'update', 'delete'], tasks: ['create', 'update', 'delete'], memberCredits: ['update'] };
  if (typeof change.module !== 'string' || typeof change.action !== 'string' || !Object.hasOwn(allowed, change.module) || !allowed[change.module].includes(change.action)) throw new ValidationError('Módulo ou ação não suportados.');
  if (!change.data || typeof change.data !== 'object' || Array.isArray(change.data)) throw new ValidationError('Dados da operação inválidos.');
  if (JSON.stringify(change.data).length > 100_000) throw new ValidationError('Operação excede o tamanho permitido.');
  return change as SyncPushChange;
}
