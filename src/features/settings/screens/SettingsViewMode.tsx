'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type SettingsViewMode = 'web' | 'mobile';

const SettingsViewModeContext = createContext<SettingsViewMode | null>(null);

export function SettingsViewModeProvider({ mode, children }: { mode: SettingsViewMode; children: ReactNode }) {
  return <SettingsViewModeContext.Provider value={mode}>{children}</SettingsViewModeContext.Provider>;
}

export function useSettingsViewMode() {
  return useContext(SettingsViewModeContext);
}
