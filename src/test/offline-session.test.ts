import { afterEach, describe, expect, it } from 'vitest';
import {
  clearCachedSession,
  getOfflineSessionKey,
  readCachedSession,
  writeCachedSession,
} from '@/lib/offline-session';

function session(tenantId: string, userId: string) {
  return {
    expires: '2099-01-01T00:00:00.000Z',
    user: { id: userId, tenantId, email: `${userId}@example.test`, name: userId },
  } as never;
}

describe('sessão offline isolada por contexto', () => {
  afterEach(() => {
    clearCachedSession();
    window.localStorage.clear();
  });

  it('lê somente o tenant e usuário apontados pelo contexto atual', () => {
    writeCachedSession(session('tenant-a', 'user-a'));
    writeCachedSession(session('tenant-b', 'user-b'));

    expect(readCachedSession()).toMatchObject({ user: { tenantId: 'tenant-b', id: 'user-b' } });
    expect(window.localStorage.getItem(getOfflineSessionKey('tenant-a', 'user-a'))).not.toBeNull();
    expect(window.localStorage.getItem(getOfflineSessionKey('tenant-b', 'user-b'))).not.toBeNull();
  });

  it('remove o cache scoped e o cache legado no logout', () => {
    writeCachedSession(session('tenant-a', 'user-a'));
    window.localStorage.setItem('church-app-offline-session', JSON.stringify(session('legacy', 'user')));

    clearCachedSession();

    expect(window.localStorage.getItem(getOfflineSessionKey('tenant-a', 'user-a'))).toBeNull();
    expect(window.localStorage.getItem('church-app-offline-session')).toBeNull();
    expect(readCachedSession()).toBeNull();
  });
});
