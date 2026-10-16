import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from '@/features/canteen/store/useCartStore';

function resetStore() {
  window.localStorage.clear();
  useCartStore.setState({
    items: [], carts: {}, activeOwnerKey: null, isReady: false, total: 0,
  });
}

describe('carrinho persistido da cantina', () => {
  beforeEach(resetStore);

  it('restaura o carrinho apenas para a mesma igreja e usuário', () => {
    const cart = useCartStore.getState();
    cart.selectOwner({ tenantId: 'church-a', userId: 'user-a' });
    cart.addItem({ productId: 'water', name: 'Água', price: 3, quantity: 1 });

    useCartStore.getState().selectOwner({ tenantId: 'church-b', userId: 'user-a' });
    expect(useCartStore.getState().items).toEqual([]);

    useCartStore.getState().selectOwner({ tenantId: 'church-a', userId: 'user-a' });
    expect(useCartStore.getState().items).toEqual([{ productId: 'water', name: 'Água', price: 3, quantity: 1 }]);
    expect(useCartStore.getState().total).toBe(3);
  });

  it('limpa somente o carrinho ativo ao concluir uma venda', () => {
    const cart = useCartStore.getState();
    cart.selectOwner({ tenantId: 'church-a', userId: 'user-a' });
    cart.addItem({ productId: 'water', name: 'Água', price: 3, quantity: 1 });
    useCartStore.getState().selectOwner({ tenantId: 'church-a', userId: 'user-b' });
    useCartStore.getState().addItem({ productId: 'bread', name: 'Pão', price: 5, quantity: 1 });

    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toEqual([]);
    useCartStore.getState().selectOwner({ tenantId: 'church-a', userId: 'user-a' });
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('separa compra pessoal e venda operacional do mesmo usuário sem perder a chave antiga', () => {
    const owner = { tenantId: 'church-a', userId: 'operator-a' };
    useCartStore.getState().selectOwner(owner);
    useCartStore.getState().addItem({ productId: 'water', name: 'Água', price: 3, quantity: 2 });
    expect(useCartStore.getState().activeOwnerKey).toBe('church-a:operator-a');
    useCartStore.getState().selectOwner({ ...owner, mode: 'purchase' });
    expect(useCartStore.getState().items).toEqual([]);
    useCartStore.getState().addItem({ productId: 'bread', name: 'Pão', price: 5, quantity: 1 });
    useCartStore.getState().selectOwner(owner);
    expect(useCartStore.getState().items[0].productId).toBe('water');
    expect(useCartStore.getState().total).toBe(6);
    useCartStore.getState().selectOwner({ ...owner, mode: 'purchase' });
    expect(useCartStore.getState().items[0].productId).toBe('bread');
    useCartStore.getState().clearCart();
    useCartStore.getState().selectOwner(owner);
    expect(useCartStore.getState().total).toBe(6);
    const persisted = JSON.parse(window.localStorage.getItem('church-canteen-carts-v1') ?? '{}');
    expect(persisted.state.carts['church-a:operator-a'].items).toHaveLength(1);
    expect(persisted.state.carts['church-a:operator-a:purchase']).toBeUndefined();
  });
});
