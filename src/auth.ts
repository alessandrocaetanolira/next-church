/**
 * auth.ts
 * 
 * Configuração central do NextAuth (v5 Beta) para o Church App.
 * Implementa autenticação baseada em credenciais com suporte a Multi-tenancy.
 * 
 * O fluxo de autenticação consiste em:
 * 1. Validar a existência e status da Igreja (Global DB).
 * 2. Autenticar as credenciais do usuário (Global DB).
 * 3. Recuperar o perfil específico do usuário no banco da Igreja (Tenant DB).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getGlobalClient, getTenantClient } from "@/lib/prisma-factory";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        churchSlug: { label: "Igreja (Slug)", type: "text" },
      },
      /**
       * Função de autorização que valida as credenciais contra os bancos Global e Tenant.
       * 
       * @param {Object} credentials - Credenciais enviadas pelo formulário de login.
       * @returns {Promise<Object|null>} Objeto do usuário autenticado ou null se falhar.
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.churchSlug) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;
        const churchSlug = String(credentials.churchSlug).trim().toLowerCase();

        try {
          const globalClient = getGlobalClient();
          
          // 1. Validar se a Igreja existe e está ativa no banco Global
          const church = await globalClient.church.findUnique({
            where: { slug: churchSlug },
          });

          if (!church || !church.active) {
            console.log("Auth: Igreja não encontrada ou inativa:", churchSlug);
            return null;
          }

          // 2. Validar o Usuário no banco Global (vinculado à igreja)
          const globalUser = await globalClient.globalUser.findFirst({
            where: { 
              email,
              churchId: church.id 
            },
          });

          if (!globalUser) {
            console.log("Auth: Usuário não vinculado a esta igreja no Global DB:", email);
            return null;
          }
          
          // Comparação da senha hashada
          const passwordMatch = await bcrypt.compare(password, globalUser.password);
          if (!passwordMatch) {
            console.log("Auth: Senha incorreta.");
            return null;
          }

          // 3. Recuperar o perfil específico (roles/permissoes) no banco do Tenant
          const tenantClient = getTenantClient(churchSlug);
          const user = await tenantClient.user.findUnique({
            where: { email },
          });

          if (!user || !user.active) {
             console.log("Auth: Perfil de usuário não encontrado ou inativo no banco da igreja.");
             return null;
          }

          // Retorna o objeto padronizado para a sessão
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions ? user.permissions.split(',') : [],
            tenantId: churchSlug,
            linkedMemberId: user.linkedMemberId,
            version: user.version,
          };
        } catch (e) {
          console.error("Auth Exception:", e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * Callback para injetar dados customizados no JWT.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.tenantId = (user as any).tenantId;
        token.linkedMemberId = (user as any).linkedMemberId;
        token.version = (user as any).version;
      }
      return token;
    },
    /**
     * Callback para expor dados do JWT na sessão do cliente.
     */
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).permissions = (token.permissions as string[]) || [];
        (session.user as any).tenantId = token.tenantId as string;
        (session.user as any).linkedMemberId = token.linkedMemberId as string | null | undefined;
        (session.user as any).version = token.version as number;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
});
