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
import { serverLogger } from '@/lib/server/logger';

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
        if (!credentials?.email || !credentials?.password) {
          serverLogger.warn('Auth', 'Credenciais incompletas.');
          return null;
        }

        const email = String(credentials.email).trim().toLowerCase();
        const password = credentials.password as string;
        const globalClient = getGlobalClient();

        // Sem slug, somente o administrador global pode autenticar. O contexto
        // global é decidido pelo servidor; nenhum sinal enviado pelo cliente
        // concede privilégios de plataforma.
        if (!credentials?.churchSlug || !String(credentials.churchSlug).trim()) {
          const platformAdmin = await globalClient.platformAdmin.findUnique({ where: { email } });
          if (!platformAdmin || !platformAdmin.active || !(await bcrypt.compare(password, platformAdmin.passwordHash))) {
            serverLogger.warn('Auth', 'Slug ausente e credenciais não pertencem ao administrador global', email);
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
            teamIds: [],
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
            serverLogger.warn('Auth', 'Igreja não encontrada ou inativa', churchSlug);
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
             serverLogger.warn('Auth', 'Usuário não encontrado, inativo ou sem senha', { email, churchSlug, databaseKey });
             return null;
          }

          const passwordMatch = await bcrypt.compare(password, user.passwordHash);
          if (!passwordMatch) {
            serverLogger.warn('Auth', 'Senha inválida', { email, churchSlug });
            return null;
          }

          const linkedMember = user.linkedMemberId
            ? await tenantClient.member.findUnique({
                where: { id: user.linkedMemberId },
                select: { teamIds: true, active: true, approved: true, deletedAt: true },
              })
            : null;
          if (user.linkedMemberId && (!linkedMember || !linkedMember.active || !linkedMember.approved || linkedMember.deletedAt)) {
            serverLogger.warn('Auth', 'Membro vinculado inativo, não aprovado ou removido', { email, churchSlug });
            return null;
          }
          const [userProfile] = await tenantClient.$queryRawUnsafe<Array<{ avatarUrl: string | null }>>(
            `SELECT avatarUrl FROM "User" WHERE id = ? LIMIT 1`,
            user.id,
          );
          const teamIds = linkedMember?.teamIds?.split(',').map((teamId) => teamId.trim()).filter(Boolean) ?? [];

          // Retorna o objeto padronizado para a sessão
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: userProfile?.avatarUrl ?? null,
            role: user.role,
            permissions: user.permissions ? user.permissions.split(',') : [],
            tenantId: databaseKey,
            tenantSlug: church.slug,
            linkedMemberId: user.linkedMemberId,
            teamIds,
            version: user.version,
            churchAuthVersion: church.authVersion,
            authValid: true,
            isPlatformAdmin: false,
            planCode: church.plan,
            planFeatures,
          };
        } catch (e) {
          serverLogger.error('Auth', 'Exceção durante autenticação', e);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    /**
     * Callback para injetar dados customizados no JWT.
     */
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.permissions = (user as any).permissions;
        token.tenantId = (user as any).tenantId;
        token.tenantSlug = (user as any).tenantSlug;
        token.picture = (user as any).image ?? null;
        token.linkedMemberId = (user as any).linkedMemberId;
        token.teamIds = (user as any).teamIds;
        token.version = (user as any).version;
        token.churchAuthVersion = (user as any).churchAuthVersion;
        token.authValid = (user as any).authValid !== false;
        token.isPlatformAdmin = Boolean((user as any).isPlatformAdmin);
        token.planCode = (user as any).planCode as string | undefined;
        token.planFeatures = (user as any).planFeatures as string[] | undefined;
      }

      // Revalida o tenant a cada leitura do JWT para invalidar sessões antigas
      // quando o tenant é desativado ou sua versão de autorização muda.
      if (!user && token.tenantSlug && token.authValid !== false) {
        try {
          const church = await getGlobalClient().church.findUnique({ where: { slug: String(token.tenantSlug) } });
          if (!church || !church.active || (church.status && church.status !== 'ACTIVE') || church.authVersion !== token.churchAuthVersion) {
            token.authValid = false;
          }
        } catch (error) {
          serverLogger.error('Auth', 'Não foi possível revalidar o tenant da sessão', error);
          token.authValid = false;
        }
      }

      // O SSE de permissões dispara `useSession().update()` no cliente. Como
      // as APIs usam o JWT no servidor, recarregamos o acesso do banco para
      // evitar exigir logout/login após uma alteração de permissões.
      if (trigger === 'update' && token.email) {
        try {
          if (token.isPlatformAdmin) {
            const platformAdmin = await getGlobalClient().platformAdmin.findUnique({ where: { email: token.email } });
            if (platformAdmin) {
              token.role = platformAdmin.role;
              token.permissions = platformAdmin.permissions?.split(',').map((permission: string) => permission.trim()).filter(Boolean) ?? [];
              token.version = platformAdmin.version;
            }
          } else if (token.tenantId) {
            const tenantClient = getTenantClient(String(token.tenantId));
            const currentUser = await tenantClient.user.findUnique({ where: { email: token.email } });
            if (currentUser) {
              token.role = currentUser.role;
              token.permissions = currentUser.permissions?.split(',').map((permission: string) => permission.trim()).filter(Boolean) ?? [];
              token.linkedMemberId = currentUser.linkedMemberId;
              const [userProfile] = await tenantClient.$queryRawUnsafe<Array<{ avatarUrl: string | null }>>(
                `SELECT avatarUrl FROM "User" WHERE id = ? LIMIT 1`,
                currentUser.id,
              );
              token.picture = userProfile?.avatarUrl ?? null;
              token.version = currentUser.version;
              token.authValid = Boolean(currentUser.active && !currentUser.deletedAt);
              const linkedMember = currentUser.linkedMemberId
                ? await tenantClient.member.findUnique({ where: { id: currentUser.linkedMemberId }, select: { teamIds: true } })
                : null;
              token.teamIds = linkedMember?.teamIds?.split(',').map((teamId) => teamId.trim()).filter(Boolean) ?? [];
            }
          }
        } catch (error) {
          serverLogger.error('Auth', 'Não foi possível atualizar as permissões da sessão', error);
        }
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
        (session.user as any).image = (token.picture as string | null | undefined) ?? null;
        (session.user as any).linkedMemberId = token.linkedMemberId as string | null | undefined;
        (session.user as any).teamIds = (token.teamIds as string[]) || [];
        (session.user as any).version = token.version as number;
        (session.user as any).authValid = token.authValid !== false;
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
