export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function isNetworkError(error: unknown) {
  return error instanceof TypeError || !(error instanceof ApiRequestError);
}

export async function apiRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiRequestError(body?.error ?? 'Não foi possível concluir a solicitação.', response.status);
  return body as T;
}
