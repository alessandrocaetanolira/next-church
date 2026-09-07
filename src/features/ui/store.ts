/**
 * ui/store.ts
 * 
 * Gerenciamento de estado de interface global (Zustand).
 * Controla modais, sidebars, temas e alertas.
 */

import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  theme: string; // 'default' | 'amber' | 'emerald' | 'violet' | 'rose' | 'slate'
  isDarkMode: boolean;
  activeModals: string[];
  pageTitle: string;

  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: string) => void;
  toggleDarkMode: () => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  setPageTitle: (title: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  theme: 'default',
  isDarkMode: false,
  activeModals: [],
  pageTitle: '',

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  
  setTheme: (theme) => set({ theme }),

  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

  openModal: (modalId) => set((state) => ({ 
    activeModals: [...state.activeModals, modalId] 
  })),

  closeModal: (modalId) => set((state) => ({ 
    activeModals: state.activeModals.filter((id) => id !== modalId) 
  })),

  setPageTitle: (title) => set({ pageTitle: title }),
}));
