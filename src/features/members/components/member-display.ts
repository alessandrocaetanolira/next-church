export type MemberRole = 'ADMIN' | 'PASTOR' | 'LEADER' | 'CANTEEN' | 'MEMBER';

export interface ManagedMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  parentPhone?: string | null;
  birthDate?: string | null;
  conversionDate?: string | null;
  baptismDate?: string | null;
  previousChurch?: string | null;
  aboutMe?: string | null;
  maritalStatus?: string | null;
  approved: boolean;
  userId: string | null;
  avatarUrl?: string | null;
  role: MemberRole | null;
  permissions: string[];
  hasAccess: boolean;
}

export type MemberPresence = Record<string, { lastSeenAt: string }>;

export const roleLabels: Record<MemberRole, string> = {
  ADMIN: 'Admin',
  PASTOR: 'Pastor',
  LEADER: 'Líder',
  MEMBER: 'Membro',
  CANTEEN: 'Cantina',
};

export const maritalStatusLabels: Record<string, string> = {
  single: 'Solteiro(a)',
  married: 'Casado(a)',
  divorced: 'Divorciado(a)',
  widowed: 'Viúvo(a)',
};
