export type DomainErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'INTERNAL';

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: DomainErrorCode = 'INTERNAL',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class UnauthenticatedError extends DomainError {
  constructor(message = 'Não autenticado.') {
    super(message, 'UNAUTHENTICATED');
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Sem permissão para executar esta ação.') {
    super(message, 'FORBIDDEN');
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Registro não encontrado.') {
    super(message, 'NOT_FOUND');
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT');
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION', details);
  }
}

export function getHttpStatus(error: unknown) {
  if (!(error instanceof DomainError)) return 500;

  switch (error.code) {
    case 'UNAUTHENTICATED': return 401;
    case 'FORBIDDEN': return 403;
    case 'NOT_FOUND': return 404;
    case 'CONFLICT': return 409;
    case 'VALIDATION': return 422;
    default: return 500;
  }
}
