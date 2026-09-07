import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LocalProduct } from '@/lib/db';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: LocalProduct) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => set((state) => {
        const existingItem = state.items.find(item => item.productId === product.id);
        
        if (existingItem) {
          return {
            items: state.items.map(item => 
              item.productId === product.id 
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          };
        }
        
        return {
          items: [...state.items, { 
            productId: product.id, 
            name: product.name, 
            price: product.price, 
            quantity: 1 
          }]
        };
      }),

      removeItem: (productId) => set((state) => ({
        items: state.items.filter(item => item.productId !== productId)
      })),

      updateQuantity: (productId, quantity) => set((state) => {
        if (quantity <= 0) {
          return { items: state.items.filter(item => item.productId !== productId) };
        }
        return {
          items: state.items.map(item => 
            item.productId === productId ? { ...item, quantity } : item
          )
        };
      }),

      clearCart: () => set({ items: [] }),

      total: () => {
        const state = get();
        return state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      }
    }),
    {
      name: 'church-app-cart', // Persistência no localStorage
    }
  )
);
