export type GameSseEvent = {
  id: string;
  tenantId: string;
  challengeId: string;
  userEmail: string;
  type: 'challenge.updated';
  payload: unknown;
  createdAt: string;
};

type Listener = (event: GameSseEvent) => void;

class GameSseBroker {
  private readonly listeners = new Map<string, Set<Listener>>();

  subscribe(tenantId: string, challengeId: string, email: string, listener: Listener) {
    const key = `${tenantId}:${challengeId}:${email.trim().toLowerCase()}`;
    const current = this.listeners.get(key) ?? new Set<Listener>();
    current.add(listener); this.listeners.set(key, current);
    return () => { const listeners = this.listeners.get(key); if (!listeners) return; listeners.delete(listener); if (!listeners.size) this.listeners.delete(key); };
  }

  publish(event: GameSseEvent) {
    const challengePrefix = `${event.tenantId}:${event.challengeId}:`;
    for (const [key, listeners] of this.listeners) {
      if (!key.startsWith(challengePrefix)) continue;
      for (const listener of listeners) listener(event);
    }
  }
}

const globalForGameSse = globalThis as unknown as { churchGameSseBroker?: GameSseBroker };
export const gameSseBroker = globalForGameSse.churchGameSseBroker ?? new GameSseBroker();
if (process.env.NODE_ENV !== 'production') globalForGameSse.churchGameSseBroker = gameSseBroker;

export function publishGameEvent(event: Omit<GameSseEvent, 'id' | 'createdAt'>) {
  gameSseBroker.publish({ ...event, id: `game:${event.challengeId}:${Date.now()}`, createdAt: new Date().toISOString() });
}
