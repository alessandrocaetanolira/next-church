/**
 * features/canteen/store/useCartStore.ts
 * 
 * Gerencia o estado do carrinho no PDV.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface CartStore {
  items: CartItem[];
  /** Carrinhos separados por tenant e usuário, persistidos somente no navegador. */
  carts: Record<string, { items: CartItem[]; updatedAt: string }>;
  activeOwnerKey: string | null;
  isReady: boolean;
  selectOwner: (owner: { tenantId: string; userId: string } | null) => void;
  addItem: (item: CartItem) => void;
  incrementItem: (productId: string) => void;
  decrementItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  total: number;
}

function calculateTotal(items: CartItem[]) {
  return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
}

function ownerKey(owner: { tenantId: string; userId: string }) {
  return `${owner.tenantId}:${owner.userId}`;
}

function setActiveItems(
  state: CartStore,
  items: CartItem[],
  options: { remove?: boolean } = {},
) {
  if (!state.activeOwnerKey) return {};
  const carts = { ...state.carts };
  if (options.remove) delete carts[state.activeOwnerKey];
  else carts[state.activeOwnerKey] = { items, updatedAt: new Date().toISOString() };
  return { carts, items, total: calculateTotal(items) };
}

/**
 * Carrinho único da Cantina. A UI precisa chamar `selectOwner` com a sessão
 * atual antes de permitir alterações; assim dados de outra igreja/conta nunca
 * são hidratados no carrinho ativo.
 */
export const useCartStore = create<CartStore>()(persist((set) => ({
  items: [],
  carts: {},
  activeOwnerKey: null,
  isReady: false,
  total: 0,
  selectOwner: (owner) => set((state) => {
    if (!owner?.tenantId || !owner.userId) {
      return { activeOwnerKey: null, items: [], total: 0, isReady: true };
    }
    const nextOwnerKey = ownerKey(owner);
    if (state.activeOwnerKey === nextOwnerKey && state.isReady) return {};
    const cart = state.carts[nextOwnerKey];
    const items = cart?.items ?? [];
    return { activeOwnerKey: nextOwnerKey, items, total: calculateTotal(items), isReady: true };
  }),
  addItem: (item) => set((state) => {
    if (!state.activeOwnerKey) return {};
    const existing = state.items.find(i => i.productId === item.productId);
    const items = existing
      ? state.items.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i)
      : [...state.items, item];

    return setActiveItems(state, items);
  }),
  incrementItem: (productId) => set((state) => {
    if (!state.activeOwnerKey) return {};
    const items = state.items.map((item) =>
      item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
    );
    return setActiveItems(state, items);
  }),
  decrementItem: (productId) => set((state) => {
    if (!state.activeOwnerKey) return {};
    const items = state.items
      .map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
      )
      .filter((item) => item.quantity > 0);

    return setActiveItems(state, items);
  }),
  removeItem: (productId) => set((state) => {
    if (!state.activeOwnerKey) return {};
    const items = state.items.filter(i => i.productId !== productId);
    return setActiveItems(state, items);
  }),
  clearCart: () => set((state) => setActiveItems(state, [], { remove: true })),
}), {
  name: 'church-canteen-carts-v1',
  version: 1,
  partialize: (state) => ({ carts: state.carts }),
  onRehydrateStorage: () => () => {
    // A chave antiga pertencia a um store que não era usado por nenhuma tela.
    // Ela não contém o contexto de tenant/usuário e não pode ser reutilizada com segurança.
    if (typeof window !== 'undefined') window.localStorage.removeItem('church-app-cart');
  },
}));
