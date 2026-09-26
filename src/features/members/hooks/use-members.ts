'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalMember } from '@/lib/db';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { generateId } from '@/lib/id';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { filterByTenant } from '@/lib/offline-tenant';

export function useMembers() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const members = useLiveQuery(
    async () => {
      if (!tenantId) return [];
      const all = filterByTenant(await db.members.toArray(), tenantId);
      return all.filter(m => !m.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
    },
    [tenantId]
  );

  const addMember = useCallback(async (member: Omit<LocalMember, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | '_status'>) => {
    const id = generateId();
    const newMember = {
      ...member,
      id,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      _status: 'pending' as const,
    };

    try {
      await db.members.add(newMember);
      await db.syncOutbox.add({
        module: 'members',
        action: 'create',
        data: newMember,
        timestamp: new Date().toISOString(),
      });
      toast.success('Membro adicionado localmente');
    } catch {
      toast.error('Erro ao adicionar membro');
    }
  }, [tenantId]);

  return {
    members: members || [],
    addMember,
    isLoading: members === undefined,
  };
}
