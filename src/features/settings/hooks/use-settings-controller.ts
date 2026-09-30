'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { clearUnscopedOfflineData, db } from '@/lib/db';
export type SettingsControllerTab = 'appearance' | 'offline' | 'notifications' | 'church';

export function useSettingsController() {
  const [settingsTab, setSettingsTab] = useState<SettingsControllerTab>('appearance');

  const clearCache = async () => {
    if (!window.confirm('Tem certeza? Todos os dados offline serão apagados.')) return;
    await db.delete();
    await db.open();
    localStorage.clear();
    toast.success('Cache e dados offline limpos com sucesso!');
    window.location.reload();
  };

  const clearLegacyOfflineData = async () => {
    if (!window.confirm('Remover dados offline antigos sem tenant identificado? O conteúdo da Bíblia será preservado.')) return;
    const removed = await clearUnscopedOfflineData();
    toast.success(`${removed} registro(s) legado(s) removido(s).`);
  };

  return { settingsTab, setSettingsTab, clearCache, clearLegacyOfflineData };
}
