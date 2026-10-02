import { db, type LocalMember } from '@/lib/db';
import { fetchCanteenMembers } from '@/services/sync/sync-api';

type RemoteMember = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  creditBalance?: number;
  role?: string | null;
  active?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function toLocalMember(member: RemoteMember, existing?: LocalMember, tenantId?: string): LocalMember {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    creditBalance: member.creditBalance ?? 0,
    role: member.role ?? existing?.role ?? 'MEMBER',
    status: member.active === false ? 'inactive' : 'active',
    avatarUrl: existing?.avatarUrl,
    createdAt: member.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
    updatedAt: member.updatedAt ?? new Date().toISOString(),
    tenantId,
    deletedAt: member.deletedAt ?? null,
    _status: 'synced',
  };
}

export async function syncCanteenMembersFromServer(tenantId?: string) {
  const response = await fetchCanteenMembers<RemoteMember[]>();
  if (!response.ok) {
    throw new Error('Falha ao buscar membros da cantina');
  }

  const members = response.data ?? [];
  const existingMembers = tenantId
    ? await db.members.filter((member) => member.tenantId === tenantId).toArray()
    : await db.members.toArray();
  const existingMap = new Map(existingMembers.map((member) => [member.id, member]));
  const normalized = Array.isArray(members)
    ? members.map((member) => toLocalMember(member, existingMap.get(member.id), tenantId))
    : [];

  const remoteIds = new Set(normalized.map((member) => member.id));
  const pendingIds = new Set(existingMembers.filter((member) => member._status === 'pending' || member._status === 'error').map((member) => member.id));

  await db.transaction('rw', db.members, async () => {
    await db.members.bulkPut(normalized.filter((member) => !pendingIds.has(member.id)));

    // A API retorna a lista completa de membros ativos. Remova do cache os
    // registros sincronizados que deixaram de existir no servidor para não
    // exibir membros excluídos/arquivados na seleção da Cantina.
    const staleIds = existingMembers
      .filter((member) => !pendingIds.has(member.id) && !remoteIds.has(member.id))
      .map((member) => member.id);
    if (staleIds.length) await db.members.bulkDelete(staleIds);

    const deletedIds = normalized
      .filter((member) => member.deletedAt)
      .map((member) => member.id);
    if (deletedIds.length) await db.members.bulkDelete(deletedIds);
  });

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

  return normalized.filter((member) => !member.deletedAt);
}
