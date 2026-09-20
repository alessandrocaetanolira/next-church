import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      permissions: string[];
      tenantId: string;
      tenantSlug: string;
      linkedMemberId?: string | null;
      version: number;
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
    linkedMemberId?: string | null;
    version: number;
    isPlatformAdmin: boolean;
    planCode?: string;
    planFeatures?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    permissions: string[];
    tenantId: string;
    tenantSlug: string;
    linkedMemberId?: string | null;
    version: number;
    isPlatformAdmin: boolean;
    planCode?: string;
    planFeatures?: string[];
  }
}
