import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      permissions: string[];
      tenantId: string;
      linkedMemberId?: string | null;
      version: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    permissions: string[];
    tenantId: string;
    linkedMemberId?: string | null;
    version: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    permissions: string[];
    tenantId: string;
    linkedMemberId?: string | null;
    version: number;
  }
}
