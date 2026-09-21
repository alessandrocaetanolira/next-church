import { ConflictError, NotFoundError, ValidationError } from '@/lib/http/errors';
import { notifyChildResponsibles } from '@/lib/server/notification-service';
import { parseJsonField, normalizeStringArray } from '@/lib/groups';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { KidsRepository, type ChildData } from './kids.repository';

export class KidsService {
  constructor(private readonly repository: KidsRepository, private readonly prisma: TenantPrismaClient, private readonly tenantId: string) {}

  async list() { return (await this.repository.list()).map((child) => this.serialize(child)); }

  async create(input: unknown) { return this.serialize((await this.repository.create(this.normalize(input))) ?? {}); }

  async update(id: string, input: unknown) {
    await this.assertExists(id);
    return this.serialize((await this.repository.update(id, this.normalize(input))) ?? {});
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.repository.remove(id);
  }

  async notify(id: string, input: unknown, actorName: string) {
    const child = await this.repository.findById(id);
    if (!child) throw new NotFoundError('Criança não encontrada.');
    const parentMemberIds = parseJsonField<string[]>(typeof child.parentMemberIds === 'string' ? child.parentMemberIds : null, []);
    if (!parentMemberIds.length) throw new ConflictError('Esta criança não possui responsável vinculado.');
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!title || !message) throw new ValidationError('Título e mensagem são obrigatórios.');
    await notifyChildResponsibles(this.prisma, this.tenantId, { childId: String(child.id), childName: String(child.name), parentMemberIds, actorName, title, message });
    return { success: true };
  }

  private async assertExists(id: string) { if (!(await this.repository.findById(id))) throw new NotFoundError('Criança não encontrada.'); }

  private normalize(input: unknown): ChildData {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Nome da criança é obrigatório.');
    let birthDate: string | null = null;
    if (body.birthDate) {
      const date = new Date(String(body.birthDate));
      if (Number.isNaN(date.getTime())) throw new ValidationError('Data de nascimento inválida.');
      birthDate = date.toISOString();
    }
    return { name, birthDate, parentMemberIds: normalizeStringArray(body.parentMemberIds), allergies: this.text(body.allergies), medications: this.text(body.medications), healthHistory: this.text(body.healthHistory), dietaryRestrictions: this.text(body.dietaryRestrictions), canDoPhysicalActivities: body.canDoPhysicalActivities !== false, notes: this.text(body.notes), groupIds: normalizeStringArray(body.groupIds) };
  }

  private text(value: unknown) { return typeof value === 'string' && value.trim() ? value.trim() : null; }

  private serialize(child: Record<string, unknown>) {
    return { ...child, parentMemberIds: parseJsonField<string[]>(typeof child.parentMemberIds === 'string' ? child.parentMemberIds : null, []), groupIds: parseJsonField<string[]>(typeof child.groupIds === 'string' ? child.groupIds : null, []) };
  }
}
