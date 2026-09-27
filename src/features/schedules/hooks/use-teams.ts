'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalTeam } from '@/lib/db';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { generateId } from '@/lib/id';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { filterByTenant } from '@/lib/offline-tenant';
import { apiRequest } from '@/services/api/client';

export function useTeams() {
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? '';
  const teams = useLiveQuery(
    async () => {
      if (!tenantId) return [];
      const all = filterByTenant(await db.teams.toArray(), tenantId);
      // Filtra times deletados (se houver campo deletedAt, o sync remove, mas preventivamente filtramos)
      return all
        .filter(t => !t.deletedAt)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    [tenantId]
  );

  useEffect(() => {
    if (!tenantId) return;

    let cancelled = false;
    void apiRequest<LocalTeam[]>('/api/schedules/teams', { cache: 'no-store' })
      .then(async (payload) => {
        if (cancelled || !Array.isArray(payload)) return;
        await db.teams.bulkPut(payload.map((team) => ({
          ...team,
          tenantId,
          deletedAt: team.deletedAt ?? null,
          _status: 'synced' as const,
        })));
      })
      .catch(() => {
        // O cache local continua disponível quando o usuário está offline.
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const addTeam = useCallback(async (team: Omit<LocalTeam, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = generateId();
    const newTeam = {
      ...team,
      id,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      _status: 'pending' as const,
    };

    try {
      await db.teams.add(newTeam);
      await db.syncOutbox.add({
        module: 'teams',
        action: 'create',
        data: newTeam,
        timestamp: new Date().toISOString(),
      });
      toast.success('Equipe criada localmente');
    } catch {
      toast.error('Erro ao criar equipe');
    }
  }, [tenantId]);

  const updateTeam = useCallback(async (id: string, updates: Partial<LocalTeam>) => {
    try {
      const updatedAt = new Date().toISOString();
      await db.teams.update(id, { ...updates, updatedAt, _status: 'pending' });
      
      const updatedTeam = await db.teams.get(id);
      await db.syncOutbox.add({
        module: 'teams',
        action: 'update',
        data: updatedTeam,
        timestamp: updatedAt,
      });
      toast.success('Equipe atualizada localmente');
    } catch {
      toast.error('Erro ao atualizar equipe');
    }
  }, []);

  const deleteTeam = useCallback(async (id: string) => {
    try {
      const updatedAt = new Date().toISOString();
      // Soft delete local
      await db.teams.update(id, { deletedAt: updatedAt, _status: 'pending' });
      
      await db.syncOutbox.add({
        module: 'teams',
        action: 'delete',
        data: { id },
        timestamp: updatedAt,
      });
      toast.success('Equipe removida localmente');
    } catch {
      toast.error('Erro ao remover equipe');
    }
  }, []);

  return {
    teams: teams || [],
    addTeam,
    updateTeam,
    deleteTeam,
    isLoading: teams === undefined,
  };
}
