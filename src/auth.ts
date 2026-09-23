/**
 * auth.ts
 * 
 * Configuração central do NextAuth (v5 Beta) para o Church App.
 * Implementa autenticação baseada em credenciais com suporte a Multi-tenancy.
 * 
 * O fluxo de autenticação consiste em:
 * 1. Validar a existência e status da Igreja (Global DB).
 * 2. Autenticar as credenciais do usuário no banco da Igreja (Tenant DB).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getGlobalClient, getTenantClient } from "@/lib/prisma-factory";
import bcrypt from "bcryptjs";
import { normalizePlanFeatures } from '@/lib/plan-features';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        churchSlug: { label: "Igreja (Slug)", type: "text" },
        platformAdmin: { label: "Platform admin", type: "text" },
      },
      /**
       * Função de autorização que valida as credenciais contra os bancos Global e Tenant.
       * 
       * @param {Object} credentials - Credenciais enviadas pelo formulário de login.
       * @returns {Promise<Object|null>} Objeto do usuário autenticado ou null se falhar.
       */
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.warn('[Auth] Credenciais incompletas.');
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = credentials.password as string;
        const globalClient = getGlobalClient();

        if (String(credentials.platformAdmin) === 'true') {
          const platformAdmin = await globalClient.platformAdmin.findUnique({ where: { email } });
          if (!platformAdmin || !platformAdmin.active || !(await bcrypt.compare(password, platformAdmin.passwordHash))) {
            return null;
          }

          return {
            id: platformAdmin.id,
            name: platformAdmin.name,
            email: platformAdmin.email,
            role: platformAdmin.role,
            permissions: platformAdmin.permissions?.split(',').map((permission) => permission.trim()).filter(Boolean) ?? [],
            tenantId: '',
            tenantSlug: '',
            linkedMemberId: null,
            version: platformAdmin.version,
            isPlatformAdmin: true,
          };
        }

        // Sem slug, somente o administrador global pode autenticar. Isso permite
        // usar uma única tela sem misturar contas de tenant e plataforma.
        if (!credentials?.churchSlug || !String(credentials.churchSlug).trim()) {
          const platformAdmin = await globalClient.platformAdmin.findUnique({ where: { email } });
          if (!platformAdmin || !platformAdmin.active || !(await bcrypt.compare(password, platformAdmin.passwordHash))) {
            console.warn('[Auth] Slug ausente e credenciais não pertencem ao administrador global:', email);
            return null;
          }
          return {
            id: platformAdmin.id,
            name: platformAdmin.name,
            email: platformAdmin.email,
            role: platformAdmin.role,
            permissions: platformAdmin.permissions?.split(',').map((permission) => permission.trim()).filter(Boolean) ?? [],
            tenantId: '',
            tenantSlug: '',
            linkedMemberId: null,
            version: platformAdmin.version,
            isPlatformAdmin: true,
          };
        }
        const churchSlug = String(credentials.churchSlug).trim().toLowerCase();

        try {
          // 1. Validar se a Igreja existe e está ativa no banco Global
          const church = await globalClient.church.findUnique({
            where: { slug: churchSlug },
          });

          if (!church || !church.active || (church.status && church.status !== 'ACTIVE')) {
            console.warn('[Auth] Igreja não encontrada ou inativa:', churchSlug);
            return null;
          }

          // 2. Recuperar o usuario e a credencial no banco do Tenant
          // O slug e publico e pode mudar; o databaseKey identifica o arquivo fisico.
          const databaseKey = church.databaseKey ?? church.slug;
          const plan = await globalClient.plan.findUnique({ where: { code: church.plan } });
          let planFeatures: string[] | undefined;
          if (plan) {
            try {
              planFeatures = normalizePlanFeatures(plan.features ? JSON.parse(plan.features) : []);
            } catch {
              planFeatures = [];
            }
          }
          const tenantClient = getTenantClient(databaseKey);
          const user = await tenantClient.user.findUnique({
            where: { email },
          });

          if (!user || !user.active || !user.passwordHash) {
             console.warn('[Auth] Usuário não encontrado, inativo ou sem senha:', { email, churchSlug, databaseKey });
             return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.passwordHash);
          if (!passwordMatch) {
            console.warn('[Auth] Senha inválida:', { email, churchSlug });
            return null;
          }

          // Retorna o objeto padronizado para a sessão
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions ? user.permissions.split(',') : [],
            tenantId: databaseKey,
            tenantSlug: church.slug,
            linkedMemberId: user.linkedMemberId,
            version: user.version,
            isPlatformAdmin: false,
            planCode: church.plan,
            planFeatures,
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
        token.tenantSlug = (user as any).tenantSlug;
        token.linkedMemberId = (user as any).linkedMemberId;
        token.version = (user as any).version;
        token.isPlatformAdmin = Boolean((user as any).isPlatformAdmin);
        token.planCode = (user as any).planCode as string | undefined;
        token.planFeatures = (user as any).planFeatures as string[] | undefined;
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
        (session.user as any).tenantSlug = token.tenantSlug as string;
        (session.user as any).linkedMemberId = token.linkedMemberId as string | null | undefined;
        (session.user as any).version = token.version as number;
        (session.user as any).isPlatformAdmin = Boolean(token.isPlatformAdmin);
        (session.user as any).planCode = token.planCode as string | undefined;
        (session.user as any).planFeatures = (token.planFeatures as string[]) || undefined;
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
