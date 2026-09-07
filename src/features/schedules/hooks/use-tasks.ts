'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, LocalTask } from '@/lib/db';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { generateId } from '@/lib/id';

export function useTasks() {
  const tasks = useLiveQuery(
    async () => {
      const all = await db.tasks.toArray();
      // Filtra tarefas deletadas e ordena por data
      return all
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
    []
  );

  const addTask = useCallback(async (task: Omit<LocalTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = generateId();
    const newTask = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _status: 'pending' as const,
    };

    try {
      await db.tasks.add(newTask);
      await db.syncOutbox.add({
        module: 'tasks',
        action: 'create',
        data: newTask,
        timestamp: new Date().toISOString(),
      });
      toast.success('Tarefa criada localmente');
    } catch {
      toast.error('Erro ao criar tarefa');
    }
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<LocalTask>) => {
    try {
      const updatedAt = new Date().toISOString();
      await db.tasks.update(id, { ...updates, updatedAt, _status: 'pending' });
      
      const updatedTask = await db.tasks.get(id);
      await db.syncOutbox.add({
        module: 'tasks',
        action: 'update',
        data: updatedTask,
        timestamp: updatedAt,
      });
      toast.success('Tarefa atualizada localmente');
    } catch {
      toast.error('Erro ao atualizar tarefa');
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      const updatedAt = new Date().toISOString();
      // Soft delete local (mas remove da view)
      // Como LocalTask não tem deletedAt explícito na interface atual, usamos _status ou removemos fisicamente se preferir
      // Mas para manter consistência com o backend (soft delete), vamos assumir que o backend trata o delete real via API
      
      // Opção 1: Remover fisicamente do Dexie para simplificar a view
      await db.tasks.delete(id);
      
      // Opção 2: Marcar como deletado (precisaria adicionar campo deletedAt em LocalTask)
      
      await db.syncOutbox.add({
        module: 'tasks',
        action: 'delete',
        data: { id },
        timestamp: updatedAt,
      });
      toast.success('Tarefa removida localmente');
    } catch {
      toast.error('Erro ao remover tarefa');
    }
  }, []);

  return {
    tasks: tasks || [],
    addTask,
    updateTask,
    deleteTask,
    isLoading: tasks === undefined,
  };
}
