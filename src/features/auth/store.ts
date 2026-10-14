/**
 * auth/store.ts
 * 
 * Gerenciamento de estado de autenticação e tenant no cliente (Zustand).
 * Mantém a sessão e as permissões do usuário logado.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getAccessibleModules, type AppModule } from '@/lib/access-control';

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: 'ADMIN' | 'PASTOR' | 'LEADER' | 'CANTEEN' | 'MEMBER';
  permissions: string[];
  churchId: string;
  tenantId: string;
  tenantSlug?: string;
  linkedMemberId?: string | null;
  teamIds: string[];
  isPlatformAdmin?: boolean;
  planCode?: string;
  planFeatures?: string[];
  accessUpdatedAt?: number;
  version?: number;
  accessibleModules: AppModule[];
}

interface AuthState {
  user: User | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setSession: (user: User | null, tenantId: string | null) => void;
  updateAccess: (access: { permissions?: string[]; role?: User['role']; planFeatures?: string[]; teamIds?: string[]; version?: number }, identity?: Pick<User, 'id' | 'tenantId'>) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenantId: null,
      isAuthenticated: false,
      isLoading: true,

      setSession: (user, tenantId) => set((state) => {
        if (user && state.user && user.id === state.user.id && user.tenantId === state.user.tenantId
          && (user.version ?? 0) < (state.user.version ?? 0)) return state;
        return { user, tenantId, isAuthenticated: !!user, isLoading: false };
      }),

      updateAccess: (access, identity) => set((state) => {
        if (!state.user) return state;
        if (identity && (identity.id !== state.user.id || identity.tenantId !== state.user.tenantId)) return state;
        // Unversioned events only trigger server reconciliation; they cannot overwrite access.
        if (access.version === undefined || access.version <= (state.user.version ?? 0)) return state;
        const definedAccess = Object.fromEntries(Object.entries(access).filter(([, value]) => value !== undefined));
        const user = { ...state.user, ...definedAccess, accessUpdatedAt: Date.now() };
        return { user: { ...user, accessibleModules: [...getAccessibleModules(user)] } };
      }),

      logout: () => set({ 
        user: null, 
        tenantId: null, 
        isAuthenticated: false 
      }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'church-auth-storage', // Nome da chave no localStorage
      storage: createJSONStorage(() => localStorage),
      // Opcional: Filtra o que deve ser persistido
      partialize: (state) => {
        const { accessUpdatedAt: _accessUpdatedAt, ...persistedUser } = state.user ?? {};
        return {
          user: state.user ? persistedUser : null,
          tenantId: state.tenantId,
          isAuthenticated: state.isAuthenticated,
        };
      },
    }
  )
);
