import { describe, expect, it, vi } from 'vitest';
import { PresenceBroker } from '@/infra/presence/presence-broker';
import { PresencePolicy } from '@/server/presence/presence.policy';

describe('presença por tenant', () => {
  it('não mistura usuários entre tenants e expira por TTL', () => {
    vi.useFakeTimers();
    const broker = new PresenceBroker(1_000);
    const events: Array<{ tenantId: string; type: string }> = [];
    broker.subscribe('tenant-a', (event) => events.push({ tenantId: event.tenantId, type: event.type }));
    broker.heartbeat('tenant-a', 'user-a');
    broker.heartbeat('tenant-b', 'user-b');

    expect(broker.list('tenant-a').map((record) => record.userId)).toEqual(['user-a']);
    vi.advanceTimersByTime(1_001);
    expect(broker.list('tenant-a')).toEqual([]);
    expect(events).toEqual([
      { tenantId: 'tenant-a', type: 'presence.updated' },
      { tenantId: 'tenant-a', type: 'presence.removed' },
    ]);
    vi.useRealTimers();
  });

  it('exige permissão explícita para perfis não administradores', () => {
    const base = { tenantId: 'tenant-a', planFeatures: ['members'] };
    expect(PresencePolicy.canView({ ...base, role: 'ADMIN', permissions: [] })).toBe(true);
    expect(PresencePolicy.canView({ ...base, role: 'PASTOR', permissions: ['members:online:view'] })).toBe(true);
    expect(PresencePolicy.canView({ ...base, role: 'MEMBER', permissions: ['members:view'] })).toBe(false);
    expect(PresencePolicy.canView({ ...base, role: 'ADMIN', permissions: [], isPlatformAdmin: true })).toBe(false);
  });
});
