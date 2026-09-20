import { generateId } from '@/lib/id';
import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { saveTenantDataUrl } from '@/lib/server/tenant-file-storage';
import { CanteenProductsRepository } from './products.repository';

type ProductInput = {
  name?: unknown; description?: unknown; imageUrl?: unknown; price?: unknown; cost?: unknown;
  stock?: unknown; minStock?: unknown; category?: unknown; active?: unknown; availableToday?: unknown;
};

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function money(value: unknown, label: string) {
  const result = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
  if (!Number.isFinite(result) || result < 0) throw new ValidationError(`${label} deve ser maior ou igual a zero.`);
  return result;
}

function quantity(value: unknown, label: string) {
  const result = money(value, label);
  if (!Number.isInteger(result)) throw new ValidationError(`${label} deve ser um número inteiro.`);
  return result;
}

export class CanteenProductsService {
  constructor(private readonly repository: CanteenProductsRepository, private readonly tenantSlug: string) {}

  list() { return this.repository.list(); }

  async create(input: unknown) {
    const data = await this.normalize(input, true);
    const body = (input && typeof input === 'object' ? input : {}) as ProductInput & { id?: unknown };
    const id = typeof body.id === 'string' && body.id.trim() ? body.id.trim() : generateId();
    return this.repository.create({ id, ...data });
  }

  async update(id: string, input: unknown) {
    await this.assertExists(id);
    const data = await this.normalize(input, false);
    return this.repository.update(id, data);
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.repository.softDelete(id);
    return { success: true };
  }

  private async normalize(input: unknown, creating: true): Promise<{
    name: string; category: string; imageUrl: string | null; description: string | null;
    price: number; cost: number; stock: number; minStock: number; active: boolean; availableToday: boolean;
  }>;
  private async normalize(input: unknown, creating: false): Promise<{
    name?: string; category?: string; imageUrl?: string | null; description?: string;
    price?: number; cost?: number; stock?: number; minStock?: number; active?: boolean; availableToday?: boolean;
  }>;
  private async normalize(input: unknown, creating: boolean) {
    const body = (input && typeof input === 'object' ? input : {}) as ProductInput;
    const name = text(body.name);
    const category = text(body.category);
    if (creating && !name) throw new ValidationError('Nome do produto é obrigatório.');
    if (creating && !category) throw new ValidationError('Categoria do produto é obrigatória.');

    let imageUrl: string | null | undefined;
    if (typeof body.imageUrl === 'string' && body.imageUrl.startsWith('data:image/')) {
      imageUrl = await saveTenantDataUrl(this.tenantSlug, 'products', body.imageUrl);
    } else if (typeof body.imageUrl === 'string' || body.imageUrl === null) {
      imageUrl = body.imageUrl;
    }

    if (creating) {
      return {
        name, category, imageUrl: imageUrl ?? null,
        description: typeof body.description === 'string' ? body.description.trim() : null,
        price: money(body.price, 'Preço'), cost: money(body.cost, 'Custo'),
        stock: quantity(body.stock, 'Estoque'), minStock: quantity(body.minStock, 'Estoque mínimo'),
        active: body.active !== false, availableToday: body.availableToday !== false,
      };
    }

    return {
      ...(typeof body.name === 'string' ? { name } : {}),
      ...(typeof body.category === 'string' ? { category } : {}),
      ...(typeof body.description === 'string' ? { description: body.description.trim() } : {}),
      ...(typeof body.price === 'number' ? { price: money(body.price, 'Preço') } : {}),
      ...(typeof body.cost === 'number' ? { cost: money(body.cost, 'Custo') } : {}),
      ...(typeof body.stock === 'number' ? { stock: quantity(body.stock, 'Estoque') } : {}),
      ...(typeof body.minStock === 'number' ? { minStock: quantity(body.minStock, 'Estoque mínimo') } : {}),
      ...(typeof body.active === 'boolean' ? { active: body.active } : {}),
      ...(typeof body.availableToday === 'boolean' ? { availableToday: body.availableToday } : {}),
      ...(typeof imageUrl !== 'undefined' ? { imageUrl } : {}),
    };
  }

  private async assertExists(id: string) {
    if (!(await this.repository.findById(id))) throw new NotFoundError('Produto não encontrado.');
  }
}
