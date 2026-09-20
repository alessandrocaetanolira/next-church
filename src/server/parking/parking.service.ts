import { ConflictError, NotFoundError, ValidationError } from '@/lib/http/errors';
import { notifyParkingOwner } from '@/lib/server/notification-service';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { ParkingRepository, type ParkingSpotData } from './parking.repository';

export class ParkingService {
  constructor(private readonly repository: ParkingRepository, private readonly prisma: TenantPrismaClient, private readonly tenantId: string) {}

  list(groupId: string | null) { return this.repository.list(groupId); }

  create(input: unknown) { return this.repository.create(this.normalize(input, true)); }

  async update(id: string, input: unknown, partial = false) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundError('Vaga não encontrada.');
    return partial ? this.repository.updateStatus(id, this.normalizeStatus(input)) : this.repository.update(id, this.normalize(input, true));
  }

  async remove(id: string) {
    if (!(await this.repository.findById(id))) throw new NotFoundError('Vaga não encontrada.');
    return this.repository.remove(id);
  }

  async notify(id: string, input: unknown, actorName: string) {
    const spot = await this.repository.findById(id);
    if (!spot) throw new NotFoundError('Vaga não encontrada.');
    if (!spot.occupiedByMemberId) throw new ConflictError('Esta vaga não possui um membro vinculado no momento.');
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!title || !message) throw new ValidationError('Título e mensagem são obrigatórios.');
    await notifyParkingOwner(this.prisma, this.tenantId, { spotId: String(spot.id), occupiedByMemberId: String(spot.occupiedByMemberId), actorName, title, message });
    return { success: true };
  }

  private normalize(input: unknown, required: boolean): ParkingSpotData {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const groupId = typeof body.groupId === 'string' ? body.groupId.trim() : '';
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    if (required && (!groupId || !label)) throw new ValidationError('Grupo e vaga são obrigatórios.');
    return { groupId, label, status: typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'free', occupiedByMemberId: typeof body.occupiedByMemberId === 'string' ? body.occupiedByMemberId.trim() || null : null, occupiedByName: typeof body.occupiedByName === 'string' ? body.occupiedByName.trim() || null : null, notes: typeof body.notes === 'string' ? body.notes.trim() || null : null, occupiedAt: body.occupiedAt ? new Date(String(body.occupiedAt)).toISOString() : null };
  }

  private normalizeStatus(input: unknown) {
    const data = this.normalize(input, false);
    return { status: data.status, occupiedByMemberId: data.occupiedByMemberId, occupiedByName: data.occupiedByName, notes: data.notes, occupiedAt: data.occupiedAt };
  }
}
