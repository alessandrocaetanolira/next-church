/**
 * features/auth/hooks/useAuth.ts
 * 
 * Custom hook para gerenciamento de autenticação no Church App.
 * Centraliza o acesso à sessão do NextAuth e fornece métodos de logout.
 * 
 * @returns {Object} Objeto contendo o usuário, status de carregamento e função de logout.
 */

"use client";

import { useSession, signOut } from "next-auth/react";
import { useAuthStore } from '@/features/auth/store';
import { clearCachedSession } from '@/lib/offline-session';

/**
 * Interface que define a estrutura de um usuário autenticado.
 */
export interface User {
  /** ID único do usuário (CUID) */
  id: string;
  /** Nome completo do usuário */
  name: string;
  /** E-mail do usuário */
  email: string;
  image?: string | null;
  /** Nível de acesso/Papel do usuário no sistema */
  role: 'ADMIN' | 'PASTOR' | 'LEADER' | 'MEMBER';
  /** Identificador da igreja (Tenant) ao qual o usuário pertence */
  tenantId: string;
  tenantSlug?: string;
  /** Membro vinculado ao usuário autenticado */
  linkedMemberId?: string | null;
  teamIds: string[];
  /** Permissões granulares do usuário */
  permissions: string[];
  isPlatformAdmin?: boolean;
  planCode?: string;
  planFeatures?: string[];
  accessUpdatedAt?: number;
}

/**
 * Hook useAuth
 * 
 * @example
 * const { user, isLoading, logout } = useAuth();
 */
export function useAuth() {
  const { data: session, status, update } = useSession();
  const storedUser = useAuthStore((state) => state.user);
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  // Mapeamento dos dados da sessão para o objeto User padronizado
  const sessionUser = session?.user ? {
    id: (session.user as any).id,
    name: session.user.name || '',
    email: session.user.email || '',
    image: session.user.image || null,
    role: (session.user as any).role || 'MEMBER',
    tenantId: (session.user as any).tenantId || '',
    tenantSlug: (session.user as any).tenantSlug || '',
    linkedMemberId: (session.user as any).linkedMemberId || null,
    teamIds: (session.user as any).teamIds || [],
    permissions: (session.user as any).permissions || [],
    isPlatformAdmin: Boolean((session.user as any).isPlatformAdmin),
    planCode: (session.user as any).planCode,
    planFeatures: (session.user as any).planFeatures,
    accessUpdatedAt: undefined,
  } as User : null;
  const user = sessionUser
    ? (storedUser && storedUser.email === sessionUser.email && storedUser.tenantId === sessionUser.tenantId
      ? {
          ...sessionUser,
          ...(storedUser.accessUpdatedAt ? {
            role: storedUser.role,
            permissions: storedUser.permissions,
            teamIds: storedUser.teamIds,
            planFeatures: storedUser.planFeatures,
          } : {}),
        }
      : sessionUser)
    : null;

  return {
    user: user ?? (isOffline ? storedUser : null),
    isOffline,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    /** Revalida a sessão e repassa permissões atualizadas para o Zustand. */
    refreshSession: update,
    /** Encerra a sessão e redireciona para a tela de login */
    logout: async () => {
      const tenantSlug = user?.isPlatformAdmin ? '' : user?.tenantSlug?.trim().toLowerCase();
      clearCachedSession();
      useAuthStore.getState().logout();
      await signOut({ redirect: false });
      window.location.replace(tenantSlug ? `/auth/login?igreja=${encodeURIComponent(tenantSlug)}` : '/auth/login');
    },
  };
}
