import { ApiRequestError } from './errors';
import type { QueryParams, RequestOptions } from './types';

function withQuery(input: RequestInfo | URL, query?: QueryParams) {
  if (!query) return input;
  const url = new URL(typeof input === 'string' ? input : input.toString(), window.location.origin);
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => item != null && url.searchParams.append(key, String(item)));
    else if (value != null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function parseBody(response: Response) {
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return response.text();
  return response.json().catch(() => null);
}

export async function apiRequest<T>(input: RequestInfo | URL, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...requestInit } = options;
  const serializedBody = body instanceof FormData || typeof body === 'string' || body == null
    ? body
    : JSON.stringify(body);
  const requestHeaders = new Headers(headers);
  if (serializedBody != null && !(serializedBody instanceof FormData) && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  const response = await fetch(input, {
    ...requestInit,
    body: serializedBody as BodyInit | null | undefined,
    headers: requestHeaders,
    credentials: requestInit.credentials ?? 'include',
  });
  const result = await parseBody(response) as { error?: string; details?: unknown } | T | null;
  if (!response.ok) {
    const errorBody = result && typeof result === 'object' ? result as { error?: string; details?: unknown } : null;
    throw new ApiRequestError(
      errorBody?.error ?? `Não foi possível concluir a solicitação (${response.status}).`,
      response.status,
      errorBody?.details,
    );
  }
  return result as T;
}

export const apiClient = {
  request: apiRequest,
  get<T>(input: RequestInfo | URL, options?: Omit<RequestOptions, 'method' | 'body'> & { query?: QueryParams }) {
    const { query, ...init } = options ?? {};
    return apiRequest<T>(withQuery(input, query), { ...init, method: 'GET' });
  },
  post<T>(input: RequestInfo | URL, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiRequest<T>(input, { ...options, method: 'POST', body });
  },
  put<T>(input: RequestInfo | URL, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiRequest<T>(input, { ...options, method: 'PUT', body });
  },
  patch<T>(input: RequestInfo | URL, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiRequest<T>(input, { ...options, method: 'PATCH', body });
  },
  delete<T>(input: RequestInfo | URL, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiRequest<T>(input, { ...options, method: 'DELETE' });
  },
};
