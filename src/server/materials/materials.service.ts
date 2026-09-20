import { generateId } from '@/lib/id';
import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { MaterialsRepository } from './materials.repository';

type MaterialInput = { name?: unknown; category?: unknown; quantity?: unknown; minQuantity?: unknown; unit?: unknown; teamId?: unknown };

function normalizeText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeQuantity(value: unknown) {
  const quantity = typeof value === 'number' || typeof value === 'string' ? Number(value) : 0;
  if (!Number.isFinite(quantity) || quantity < 0) throw new ValidationError('A quantidade deve ser um número maior ou igual a zero.');
  return Math.floor(quantity);
}

function normalizeMaterial(input: MaterialInput, includeTeam = false) {
  const name = normalizeText(input.name, '');
  if (!name) throw new ValidationError('Nome é obrigatório.');
  return {
    name,
    category: normalizeText(input.category, 'Outros'),
    quantity: normalizeQuantity(input.quantity),
    minQuantity: normalizeQuantity(input.minQuantity),
    unit: normalizeText(input.unit, 'unidades'),
    ...(includeTeam ? { teamId: typeof input.teamId === 'string' && input.teamId.trim() ? input.teamId.trim() : null } : {}),
  };
}

export class MaterialsService {
  constructor(private readonly repository: MaterialsRepository) {}

  list(teamIds?: string[]) { return this.repository.list(teamIds); }

  create(input: unknown) {
    const data = normalizeMaterial((input ?? {}) as MaterialInput, true);
    return this.repository.create({ id: generateId(), ...data });
  }

  async update(id: string, input: unknown) {
    await this.assertExists(id);
    const body = (input ?? {}) as MaterialInput;
    const data = normalizeMaterial(body);
    return this.repository.update(id, { ...data, ...(typeof body.teamId === 'string' ? { teamId: body.teamId.trim() || null } : {}) });
  }

  async updateQuantity(id: string, input: unknown) {
    await this.assertExists(id);
    const quantity = normalizeQuantity((input as MaterialInput | null)?.quantity);
    return this.repository.update(id, { quantity });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.repository.softDelete(id);
    return { success: true };
  }

  private async assertExists(id: string) {
    if (!(await this.repository.findById(id))) throw new NotFoundError('Material não encontrado.');
  }
}
