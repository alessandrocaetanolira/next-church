export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export function isNetworkError(error: unknown) {
  return error instanceof TypeError || !(error instanceof ApiRequestError);
}
