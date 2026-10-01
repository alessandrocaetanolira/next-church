import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      permissions: string[];
      tenantId: string;
      tenantSlug: string;
      id: string;
      image?: string | null;
      linkedMemberId?: string | null;
      teamIds: string[];
      version: number;
      authValid?: boolean;
      isPlatformAdmin: boolean;
      planCode?: string;
      planFeatures?: string[];
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    permissions: string[];
    tenantId: string;
    tenantSlug: string;
    id: string;
    image?: string | null;
    linkedMemberId?: string | null;
    teamIds: string[];
    version: number;
    churchAuthVersion?: number;
    authValid?: boolean;
    isPlatformAdmin: boolean;
    planCode?: string;
    planFeatures?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    picture?: string | null;
    role: string;
    permissions: string[];
    tenantId: string;
    tenantSlug: string;
    linkedMemberId?: string | null;
    teamIds: string[];
    version: number;
    churchAuthVersion?: number;
    authValid?: boolean;
    isPlatformAdmin: boolean;
    planCode?: string;
    planFeatures?: string[];
  }
}
