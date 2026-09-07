import { db, type LocalMember } from '@/lib/db';

type RemoteMember = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  creditBalance?: number;
  role?: string | null;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function toLocalMember(member: RemoteMember, existing?: LocalMember): LocalMember {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    creditBalance: member.creditBalance ?? 0,
    role: member.role ?? existing?.role ?? 'MEMBER',
    status: existing?.status ?? 'active',
    avatarUrl: existing?.avatarUrl,
    createdAt: member.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
    updatedAt: member.updatedAt ?? new Date().toISOString(),
    deletedAt: member.deletedAt ?? existing?.deletedAt ?? null,
    _status: 'synced',
  };
}

export async function syncCanteenMembersFromServer() {
  const response = await fetch('/api/members', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Falha ao buscar membros da cantina');
  }

  const members = (await response.json()) as RemoteMember[];
  const existingMembers = await db.members.toArray();
  const existingMap = new Map(existingMembers.map((member) => [member.id, member]));
  const normalized = Array.isArray(members)
    ? members.map((member) => toLocalMember(member, existingMap.get(member.id)))
    : [];

  await db.members.bulkPut(normalized);

  const debtors = normalized.filter((member) => (member.creditBalance ?? 0) > 0);
  console.info('[canteen-fiado] sync members', {
    totalMembers: normalized.length,
    debtors: debtors.length,
    debtorsPreview: debtors.slice(0, 5).map((member) => ({
      id: member.id,
      name: member.name,
      creditBalance: member.creditBalance ?? 0,
    })),
  });

  return normalized;
}
