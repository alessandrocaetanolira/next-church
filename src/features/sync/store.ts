/**
 * sync/store.ts
 * 
 * Gerenciamento de estado de sincronização (Zustand).
 * Controla a fila de outbox e o status da conexão.
 */

import { create } from 'zustand';
import { db } from '@/lib/db';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSyncAt: Record<string, string>; // Módulo -> Timestamp

  // Actions
  setOnline: (status: boolean) => void;
  setSyncing: (status: boolean) => void;
  updatePendingCount: () => Promise<void>;
  setLastSyncAt: (module: string, timestamp: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingChanges: 0,
  lastSyncAt: {},

  setOnline: (status) => set({ isOnline: status }),
  
  setSyncing: (status) => set({ isSyncing: status }),

  updatePendingCount: async () => {
    const count = await db.syncOutbox.count();
    set({ pendingChanges: count });
  },

  setLastSyncAt: (module, timestamp) => set((state) => ({
    lastSyncAt: { ...state.lastSyncAt, [module]: timestamp }
  })),
}));
