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
  /** Nível de acesso/Papel do usuário no sistema */
  role: 'ADMIN' | 'PASTOR' | 'LEADER' | 'MEMBER';
  /** Identificador da igreja (Tenant) ao qual o usuário pertence */
  tenantId: string;
  /** Membro vinculado ao usuário autenticado */
  linkedMemberId?: string | null;
  /** Permissões granulares do usuário */
  permissions: string[];
  isPlatformAdmin?: boolean;
  planCode?: string;
  planFeatures?: string[];
}

/**
 * Hook useAuth
 * 
 * @example
 * const { user, isLoading, logout } = useAuth();
 */
export function useAuth() {
  const { data: session, status } = useSession();

  // Mapeamento dos dados da sessão para o objeto User padronizado
  const user = session?.user ? {
    id: (session.user as any).id,
    name: session.user.name || '',
    email: session.user.email || '',
    role: (session.user as any).role || 'MEMBER',
    tenantId: (session.user as any).tenantId || '',
    linkedMemberId: (session.user as any).linkedMemberId || null,
    permissions: (session.user as any).permissions || [],
    isPlatformAdmin: Boolean((session.user as any).isPlatformAdmin),
    planCode: (session.user as any).planCode,
    planFeatures: (session.user as any).planFeatures,
  } as User : null;

  return {
    user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    /** Encerra a sessão e redireciona para a tela de login */
    logout: () => signOut({ callbackUrl: "/auth/login" }),
  };
}
