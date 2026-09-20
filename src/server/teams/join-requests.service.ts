import { ValidationError } from '@/lib/http/errors';
import { notifyTeamJoinRequest } from '@/lib/server/notification-service';
import type { PrismaClient as TenantPrismaClient } from '@/generated/prisma-tenant';
import { TeamJoinRequestsRepository } from './join-requests.repository';

export class TeamJoinRequestsService {
  constructor(private readonly repository: TeamJoinRequestsRepository, private readonly prisma: TenantPrismaClient, private readonly tenantId: string) {}

  list(role: string | null | undefined, linkedMemberId: string | null | undefined) { return this.repository.list(role, linkedMemberId); }

  async request(memberId: string, input: unknown) {
    const teamId = input && typeof input === 'object' && typeof (input as { teamId?: unknown }).teamId === 'string' ? (input as { teamId: string }).teamId.trim() : '';
    if (!teamId) throw new ValidationError('Time inválido.');
    const result = await this.repository.create(memberId, teamId);
    await notifyTeamJoinRequest(this.prisma, this.tenantId, { requestId: result.id, memberName: result.memberName, teamId: result.teamId, teamName: result.teamName });
    return { success: true, id: result.id };
  }

  decide(id: string, action: 'approve' | 'reject') { return this.repository.decide(id, action); }
}
