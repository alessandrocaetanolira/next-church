import { PrismaClient } from '@/generated/prisma-global';

type Counter = { attempts: number | bigint; expiresAt: string };

/** SQLite separado dos bancos de domínio; compartilha contadores entre processos. */
export class AuthRateLimitStore {
  private readonly client: PrismaClient;
  private ready?: Promise<void>;
  private nextCleanup = 0;

  constructor(filename: string) {
    this.client = new PrismaClient({ datasources: { db: { url: `file:${filename}` } } });
  }

  private initialize() {
    if (!this.ready) {
      this.ready = (async () => {
        await this.client.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "AuthRateLimit" (
          "key" TEXT PRIMARY KEY, "attempts" INTEGER NOT NULL, "expiresAt" INTEGER NOT NULL
        )`);
        await this.client.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "AuthRateLimit_expiry" ON "AuthRateLimit" ("expiresAt")');
      })().catch((error: unknown) => { this.ready = undefined; throw error; });
    }
    return this.ready;
  }

  async consume(key: string, limit: number, windowMs: number, now = Date.now()) {
    await this.initialize();
    if (now >= this.nextCleanup) {
      await this.client.$executeRawUnsafe('DELETE FROM "AuthRateLimit" WHERE "expiresAt" <= ?', now);
      this.nextCleanup = now + 60_000;
    }
    // Uma única instrução decide a admissão. O contador satura e o bloqueio não
    // estende a janela, mesmo com processos/requisições concorrentes.
    const [counter] = await this.client.$queryRawUnsafe<Counter[]>(`
      INSERT INTO "AuthRateLimit" ("key", "attempts", "expiresAt") VALUES (?, 1, ?)
      ON CONFLICT("key") DO UPDATE SET
        "attempts" = CASE WHEN "expiresAt" <= ? THEN 1 ELSE MIN("attempts" + 1, ?) END,
        "expiresAt" = CASE WHEN "expiresAt" <= ? THEN excluded."expiresAt" ELSE "expiresAt" END
      RETURNING "attempts", CAST("expiresAt" AS TEXT) AS "expiresAt"
    `, key, now + windowMs, now, limit + 1, now);
    if (!counter) throw new Error('Contador de autenticação indisponível.');
    return {
      allowed: Number(counter.attempts) <= limit,
      retryAfter: Math.max(1, Math.ceil((Number(counter.expiresAt) - now) / 1000)),
    };
  }

  disconnect() { return this.client.$disconnect(); }
}
