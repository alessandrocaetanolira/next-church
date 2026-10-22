import { AsyncLocalStorage } from 'node:async_hooks';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseDirectory, getGlobalClient } from '@/lib/prisma-factory';
import { AuthRateLimitStore } from './auth-rate-limit-store';

type Operation = 'login' | 'register';
const checkedLogin = new AsyncLocalStorage<boolean>();
const stores = new Map<string, AuthRateLimitStore>();
const MAX_BODY_BYTES = 16 * 1024;

export class PublicAuthRequestError extends Error {
  constructor(public readonly status: number, message: string, public readonly retryAfter?: number) { super(message); }
}

function getStore() {
  const filename = path.join(getDatabaseDirectory(), 'auth-security.db');
  let store = stores.get(filename);
  if (!store) { store = new AuthRateLimitStore(filename); stores.set(filename, store); }
  return store;
}

export async function closeAuthRateLimitStores() {
  await Promise.all([...stores.values()].map((store) => store.disconnect()));
  stores.clear();
}

/** Sem proxy explicitamente confiável, usar um bucket agregado seguro. */
export function getAuthClientAddress(headers: Headers) {
  const configured = process.env.AUTH_RATE_LIMIT_IP_HEADER;
  if (!configured) return 'unverified-source';
  if (!['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for'].includes(configured)) {
    throw new Error('Cabeçalho de origem não suportado.');
  }
  let value = headers.get(configured)?.trim() ?? '';
  if (configured === 'x-forwarded-for') {
    const hops = Number(process.env.AUTH_RATE_LIMIT_PROXY_HOPS);
    if (!Number.isInteger(hops) || hops < 1 || hops > 10) throw new Error('Cadeia de proxies não configurada.');
    const chain = value.split(',').map((part) => part.trim());
    value = chain.length <= 32 ? chain.at(-hops) ?? '' : '';
  }
  const version = isIP(value);
  if (!version) return 'unverified-source';
  if (version === 4) return value;
  const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]+):([a-f0-9]+)$/i.exec(normalized);
  if (!mapped) return normalized;
  const high = Number.parseInt(mapped[1], 16);
  const low = Number.parseInt(mapped[2], 16);
  return `${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`;
}

function configuredLimit(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 100_000) throw new Error('Limite de autenticação inválido.');
  return value;
}

async function consume(operation: Operation, dimension: 'ip' | 'account', identity: string) {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('Segredo de autenticação não configurado.');
  const key = createHmac('sha256', secret).update(JSON.stringify([operation, dimension, identity])).digest('hex');
  const login = operation === 'login';
  const limit = dimension === 'ip'
    ? configuredLimit(login ? 'AUTH_LOGIN_IP_LIMIT' : 'AUTH_REGISTER_IP_LIMIT', login ? 60 : 5)
    : configuredLimit(login ? 'AUTH_LOGIN_ACCOUNT_LIMIT' : 'AUTH_REGISTER_ACCOUNT_LIMIT', login ? 5 : 3);
  const windowMs = dimension === 'ip' && login ? 5 * 60_000 : login || dimension === 'ip' ? 15 * 60_000 : 60 * 60_000;
  const result = await getStore().consume(key, limit, windowMs);
  if (!result.allowed) throw new PublicAuthRequestError(429, 'Muitas tentativas. Aguarde e tente novamente.', result.retryAfter);
}

function identity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PublicAuthRequestError(400, 'Dados de acesso inválidos.');
  const record = input as Record<string, unknown>;
  if (typeof record.email !== 'string' || !record.email.trim() || record.email.length > 254
    || (record.churchSlug != null && (typeof record.churchSlug !== 'string' || record.churchSlug.length > 120))) {
    throw new PublicAuthRequestError(400, 'Dados de acesso inválidos.');
  }
  return { email: record.email.trim().toLowerCase(), slug: typeof record.churchSlug === 'string' ? record.churchSlug.trim().toLowerCase() : '' };
}

async function consumeIdentity(operation: Operation, input: unknown) {
  const { email, slug } = identity(input);
  // Resolver o ID persistido impede reiniciar a quota renomeando o slug.
  const church = slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ? await getGlobalClient().church.findUnique({ where: { slug }, select: { id: true } })
    : null;
  const scope = slug ? `church:${church?.id ?? 'unavailable'}` : 'platform';
  await consume(operation, 'account', JSON.stringify([scope, email]));
}

async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new PublicAuthRequestError(400, 'Dados inválidos.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new PublicAuthRequestError(413, 'Dados acima do tamanho permitido.');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

export function publicAuthErrorResponse(error: unknown, request?: Request) {
  const known = error instanceof PublicAuthRequestError;
  const status = known ? error.status : 503;
  const message = known ? error.message : 'Não foi possível concluir agora. Tente novamente mais tarde.';
  const code = status === 429 ? 'rate_limited' : status === 503 ? 'temporarily_unavailable' : 'invalid_request';
  const url = request ? new URL(`/auth/login?error=CredentialsSignin&code=${code}`, request.url).href : undefined;
  return NextResponse.json({ error: message, code, ...(url ? { url } : {}) }, {
    status, headers: { 'Cache-Control': 'no-store', ...(known && error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}) },
  });
}

export async function protectPublicAuthRequest(request: Request, operation: Operation, handler: (request: NextRequest) => Promise<Response>) {
  try {
    await consume(operation, 'ip', getAuthClientAddress(request.headers));
    const body = await readBody(request);
    const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    let input: unknown;
    try {
      input = contentType === 'application/json' ? JSON.parse(body)
        : contentType === 'application/x-www-form-urlencoded' && operation === 'login' ? Object.fromEntries(new URLSearchParams(body))
          : undefined;
    } catch { throw new PublicAuthRequestError(400, 'Dados inválidos.'); }
    if (input === undefined) throw new PublicAuthRequestError(415, 'Formato de dados não suportado.');
    await consumeIdentity(operation, input);
    const forwarded = new NextRequest(request.url, { method: request.method, headers: request.headers, body });
    const run = () => handler(forwarded);
    return operation === 'login' ? await checkedLogin.run(true, run) : await run();
  } catch (error) { return publicAuthErrorResponse(error, operation === 'login' ? request : undefined); }
}

/** Também cobre authorize chamado por Server Actions, sem cobrar novamente a rota. */
export async function ensureLoginRateLimit(request: Request, credentials: unknown) {
  if (checkedLogin.getStore()) return;
  await consume('login', 'ip', getAuthClientAddress(request.headers));
  await consumeIdentity('login', credentials);
}
