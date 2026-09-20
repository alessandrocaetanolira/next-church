import { NotFoundError, ValidationError } from '@/lib/http/errors';
import { PastoralRepository } from './pastoral.repository';

export class PastoralService {
  constructor(private readonly repository: PastoralRepository) {}

  listPending() { return this.repository.listPending(); }

  async approve(id: string) {
    const member = await this.repository.findMemberForApproval(id);
    if (!member) throw new NotFoundError('Membro não encontrado.');
    if (!member.passwordHash) throw new ValidationError('Cadastro sem senha válida para aprovação.');
    await this.repository.approve(member.id, { name: member.name, email: member.email, passwordHash: member.passwordHash });
    return { success: true };
  }

  async reject(id: string) {
    const member = await this.repository.findMemberForApproval(id);
    if (!member) throw new NotFoundError('Membro não encontrado.');
    await this.repository.reject(id);
    return { success: true };
  }
}
