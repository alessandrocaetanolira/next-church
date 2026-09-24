export type SyncResponse<T> = { ok: boolean; status: number; data?: T };
async function safeJson<T>(response: Response): Promise<T | undefined> { try { return await response.json(); } catch { return undefined; } }
export async function syncRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<SyncResponse<T>> { const response = await fetch(input, init); return { ok: response.ok, status: response.status, data: await safeJson<T>(response) }; }
export function fetchCanteenSales<T>() { return syncRequest<T>('/api/canteen/sales', { cache: 'no-store' }); }
export function fetchCanteenMembers<T>() { return syncRequest<T>('/api/members', { cache: 'no-store' }); }
export function fetchMemberFinancials<T>() { return syncRequest<T>('/api/members/me/financials', { cache: 'no-store' }); }
