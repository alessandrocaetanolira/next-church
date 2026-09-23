export async function apiRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    credentials: 'include',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? 'Não foi possível concluir a solicitação.');
  return body as T;
}
