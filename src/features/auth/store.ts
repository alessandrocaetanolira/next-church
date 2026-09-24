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
  role: 'ADMIN' | 'PASTOR' | 'LEADER' | 'MEMBER';
  permissions: string[];
  churchId: string;
  tenantId: string;
  linkedMemberId?: string | null;
  isPlatformAdmin?: boolean;
  planCode?: string;
  planFeatures?: string[];
  accessibleModules: AppModule[];
}

interface AuthState {
  user: User | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setSession: (user: User | null, tenantId: string | null) => void;
  updateAccess: (access: { permissions?: string[]; role?: User['role']; planFeatures?: string[] }) => void;
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

      setSession: (user, tenantId) => set({ 
        user, 
        tenantId, 
        isAuthenticated: !!user,
        isLoading: false 
      }),

      updateAccess: (access) => set((state) => {
        if (!state.user) return state;
        const user = { ...state.user, ...access };
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
      partialize: (state) => ({ 
        user: state.user, 
        tenantId: state.tenantId, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
