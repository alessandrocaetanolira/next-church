import { describe, expect, it } from 'vitest';
import { getCanteenAccess, resolveCanteenView } from '@/lib/canteen/access';
import { getRoleDefaultPermissions } from '@/lib/permission-catalog';
import { CanteenSalesPolicy } from '@/server/canteen/sales.policy';
import { CanteenSalesDetailPolicy } from '@/server/canteen/sales-detail.policy';

const buyer = { role: 'MEMBER', permissions: getRoleDefaultPermissions('MEMBER'), planFeatures: ['canteen'] };

describe('compra pessoal e operação da Cantina', () => {
  it.each(['MEMBER', 'LEADER', 'PASTOR'])('%s compra sem receber operações administrativas', (role) => {
    const user = { ...buyer, role, permissions: getRoleDefaultPermissions(role) };
    const access = getCanteenAccess(user);
    expect(access.canBrowse).toBe(true);
    expect(access.canOrder).toBe(true);
    expect(access.operationalTabs).toEqual([]);
    expect(access.canViewSales).toBe(false);
    expect(resolveCanteenView(user, 'sales')).toBe('cart');
    expect(() => CanteenSalesPolicy.assertCreate(user)).not.toThrow();
    expect(() => CanteenSalesPolicy.assertView(user)).toThrow('consultar vendas');
    expect(() => CanteenSalesDetailPolicy.assertOperate(user)).toThrow('operar pedidos');
  });

  it('view/catalog básicos não permitem ler vendas de outros compradores', () => {
    const user = { ...buyer, permissions: ['canteen:view', 'canteen:catalog'] };
    expect(getCanteenAccess(user).canBrowse).toBe(true);
    expect(getCanteenAccess(user).canOrder).toBe(false);
    expect(resolveCanteenView(user, 'sales')).toBe('catalog');
    expect(() => CanteenSalesPolicy.assertView(user)).toThrow('consultar vendas');
    expect(() => CanteenSalesPolicy.assertCreate(user)).toThrow('registrar pedidos');
  });

  it('permissão isolada de pedido permite comprar sem exigir operar ou vender', () => {
    const user = { ...buyer, permissions: ['canteen:order'] };
    expect(getCanteenAccess(user).canBrowse).toBe(true);
    expect(resolveCanteenView(user, 'pdv')).toBe('cart');
    expect(() => CanteenSalesPolicy.assertCreate(user)).not.toThrow();
  });

  it('permissões operacionais explícitas funcionam sem depender do nome do perfil', () => {
    const user = { ...buyer, role: 'LEADER', permissions: [...buyer.permissions, 'canteen:sell', 'canteen:operate'] };
    const access = getCanteenAccess(user);
    expect(access.operationalTabs).toEqual(['orders', 'prep', 'sales']);
    expect(access.canViewSales).toBe(true);
    expect(resolveCanteenView(user, null)).toBe('cart');
    expect(() => CanteenSalesDetailPolicy.assertOperate(user)).not.toThrow();
  });

  it.each(['ADMIN', 'CANTEEN'])('%s também pode entrar explicitamente em compra pessoal', (role) => {
    const user = { ...buyer, role, permissions: getRoleDefaultPermissions(role) };
    expect(getCanteenAccess(user).canOrder).toBe(true);
    expect(resolveCanteenView(user, 'buy')).toBe('cart');
    expect(resolveCanteenView(user, null)).toBe('cart');
    expect(() => CanteenSalesPolicy.assertView(user)).not.toThrow();
  });

  it('cada aba operacional exige sua própria permissão', () => {
    const onlyPrep = { ...buyer, permissions: ['canteen:operate'] };
    expect(getCanteenAccess(onlyPrep).operationalTabs).toEqual(['orders', 'prep']);
    expect(resolveCanteenView(onlyPrep, 'products')).toBe('orders');
    expect(resolveCanteenView(onlyPrep, 'pdv')).toBe('orders');
    expect(() => CanteenSalesPolicy.assertCreate(onlyPrep)).toThrow('registrar pedidos');
  });

  it('plano sem Cantina bloqueia membro, sem conceder permissões por fallback', () => {
    const user = { ...buyer, planFeatures: ['bible'] };
    expect(getCanteenAccess(user).canOrder).toBe(false);
    expect(getCanteenAccess(user).operationalTabs).toEqual([]);
    expect(resolveCanteenView(user, 'buy')).toBe('none');
    expect(() => CanteenSalesPolicy.assertCreate(user)).toThrow();
  });

  it('revogação e ausência de sessão não mantêm acesso operacional anterior', () => {
    expect(resolveCanteenView({ ...buyer, permissions: [] }, 'pdv')).toBe('none');
    expect(resolveCanteenView(buyer, 'pdv')).toBe('cart');
    expect(resolveCanteenView(null, 'sales')).toBe('none');
    expect(() => CanteenSalesPolicy.assertView(null)).toThrow();
  });
});
