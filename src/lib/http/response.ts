import { NextResponse } from 'next/server';
import { DomainError, getHttpStatus } from './errors';

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown) {
  const domainError = error instanceof DomainError ? error : null;
  const status = getHttpStatus(error);

  return NextResponse.json(
    {
      error: domainError?.message ?? 'Erro interno do servidor.',
      ...(domainError?.details ? { details: domainError.details } : {}),
    },
    { status },
  );
}
