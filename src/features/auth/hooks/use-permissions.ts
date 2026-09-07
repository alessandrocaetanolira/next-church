/**
 * hooks/use-permissions.ts
 * 
 * Hook para facilitar a verificação de permissões do usuário logado.
 */

import { useSession } from "next-auth/react";

/**
 * Hook para gerenciar permissões e papéis do usuário.
 */
export const usePermissions = () => {
  const { data: session, status } = useSession();

  const user = session?.user;
  const role = user?.role;
  const permissions = user?.permissions || [];

  /**
   * Verifica se o usuário tem uma permissão específica ou se é ADMIN.
   * @param {string} permission - A permissão a ser verificada.
   * @returns {boolean}
   */
  const hasPermission = (permission: string): boolean => {
    if (role === "ADMIN") return true;
    return permissions.includes(permission);
  };

  /**
   * Verifica se o usuário tem um dos papéis informados.
   * @param {string[]} roles - Lista de papéis permitidos.
   * @returns {boolean}
   */
  const hasRole = (roles: string[]): boolean => {
    if (!role) return false;
    if (role === "ADMIN") return true;
    return roles.includes(role);
  };

  return {
    user,
    role,
    permissions,
    hasPermission,
    hasRole,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
  };
};
