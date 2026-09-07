/**
 * features/canteen/store/useCartStore.ts
 * 
 * Gerencia o estado do carrinho no PDV.
 */

import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface CartStore {
  items: CartItem[];
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

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  total: 0,
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.productId === item.productId);
    const items = existing
      ? state.items.map(i => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i)
      : [...state.items, item];

    return {
      items,
      total: calculateTotal(items),
    };
  }),
  incrementItem: (productId) => set((state) => {
    const items = state.items.map((item) =>
      item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
    );

    return {
      items,
      total: calculateTotal(items),
    };
  }),
  decrementItem: (productId) => set((state) => {
    const items = state.items
      .map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
      )
      .filter((item) => item.quantity > 0);

    return {
      items,
      total: calculateTotal(items),
    };
  }),
  removeItem: (productId) => set((state) => {
    const items = state.items.filter(i => i.productId !== productId);
    return {
      items,
      total: calculateTotal(items),
    };
  }),
  clearCart: () => set({ items: [], total: 0 }),
}));
