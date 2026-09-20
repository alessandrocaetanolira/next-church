import { ValidationError } from '@/lib/http/errors';
import { TeamsRepository } from './teams.repository';

export class TeamsService {
  constructor(private readonly repository: TeamsRepository) {}

  list() { return this.repository.list(); }

  create(input: unknown) {
    return this.repository.create(this.normalize(input));
  }

  update(input: unknown, id: string) {
    return this.repository.update(id, this.normalize(input));
  }

  remove(id: string) {
    return this.repository.remove(id);
  }

  private normalize(input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Nome é obrigatório.');
    return {
      name,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      color: typeof body.color === 'string' && body.color.trim() ? body.color.trim() : 'primary',
      icon: typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : 'users',
      memberIds: Array.isArray(body.memberIds) ? body.memberIds.filter((id): id is string => typeof id === 'string' && Boolean(id)) : [],
      leaderIds: Array.isArray(body.leaderIds) ? body.leaderIds.filter((id): id is string => typeof id === 'string' && Boolean(id)) : [],
    };
  }
}
