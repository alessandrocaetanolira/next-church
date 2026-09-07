'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalMember } from '@/lib/db';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { generateId } from '@/lib/id';

export function useMembers() {
  const members = useLiveQuery(
    async () => {
      const all = await db.members.toArray();
      return all.filter(m => !m.deletedAt).sort((a, b) => a.name.localeCompare(b.name));
    },
    []
  );

  const addMember = useCallback(async (member: Omit<LocalMember, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | '_status'>) => {
    const id = generateId();
    const newMember = {
      ...member,
      id,
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
  }, []);

  return {
    members: members || [],
    addMember,
    isLoading: members === undefined,
  };
}
