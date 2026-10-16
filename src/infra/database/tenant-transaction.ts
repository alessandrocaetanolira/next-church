import type { Prisma, PrismaClient } from '@/generated/prisma-tenant';

export type TenantDatabase = PrismaClient | Prisma.TransactionClient;

/** Reutiliza a transação da rotina chamadora, sem abrir uma transação aninhada. */
export function inTenantTransaction<T>(db: TenantDatabase, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return '$transaction' in db ? db.$transaction(work) : work(db);
}

/** Efeitos externos devem acontecer somente após o commit da operação financeira. */
export type AfterCommit = (effect: () => Promise<unknown>) => void;
