import { CanteenProductsPolicy } from './products.policy';
import { CanteenProductsService } from './products.service';
import { ValidationError } from '@/lib/http/errors';

type ControllerContext = { user: Parameters<typeof CanteenProductsPolicy.assertCatalog>[0]; service: CanteenProductsService };

export function listProducts({ user, service }: ControllerContext) { CanteenProductsPolicy.assertCatalog(user); return service.list(); }
export function createProduct({ user, service }: ControllerContext, input: unknown) { CanteenProductsPolicy.assertManage(user); return service.create(input); }
export function updateProduct({ user, service }: ControllerContext, id: string, input: unknown) { CanteenProductsPolicy.assertManage(user); return service.update(id, input); }
export function deleteProduct({ user, service }: ControllerContext, id: string) { CanteenProductsPolicy.assertManage(user); return service.remove(id); }

export function syncProduct({ user, service }: ControllerContext, action: 'create' | 'update' | 'delete', input: unknown) {
  CanteenProductsPolicy.assertManage(user);
  const data = (input && typeof input === 'object' ? input : {}) as { id?: unknown };
  if (typeof data.id !== 'string' || !data.id.trim()) throw new ValidationError('Identificador do produto é obrigatório.');
  if (action === 'create') return service.create(input);
  if (action === 'update') return service.update(data.id, input);
  return service.remove(data.id);
}
