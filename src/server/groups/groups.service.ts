import { generateId } from '@/lib/id';
import { ValidationError } from '@/lib/http/errors';
import { normalizeStringArray } from '@/lib/groups';
import { GroupsRepository } from './groups.repository';

export class GroupsService {
  constructor(private readonly repository: GroupsRepository) {}

  list(type: string | null) { return this.repository.list(type); }

  get(id: string) { return this.repository.findById(id); }

  create(input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Nome é obrigatório.');
    const type = typeof body.type === 'string' && body.type.trim() ? body.type.trim() : 'team';
    const rawMembers = Array.isArray(body.members) ? body.members : [];
    const members = rawMembers.flatMap((item) => {
      const member = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      if (typeof member.memberId !== 'string' || !member.memberId) return [];
      return [{ memberId: member.memberId, role: typeof member.role === 'string' ? member.role : 'member' }];
    });

    return this.repository.create({
      id: generateId(), name, type,
      description: typeof body.description === 'string' ? body.description.trim() : '',
      color: typeof body.color === 'string' && body.color.trim() ? body.color.trim() : 'primary',
      icon: typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : 'users',
      capabilities: normalizeStringArray(body.capabilities), members,
    });
  }

  update(id: string, input: unknown) {
    return this.repository.update(id, this.normalize(input));
  }

  remove(id: string) {
    return this.repository.remove(id);
  }

  private normalize(input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) throw new ValidationError('Nome é obrigatório.');
    const rawMembers = Array.isArray(body.members) ? body.members : [];
    const members = rawMembers.flatMap((item) => {
      const member = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      if (typeof member.memberId !== 'string' || !member.memberId) return [];
      return [{ memberId: member.memberId, role: typeof member.role === 'string' ? member.role : 'member' }];
    });
    return {
      name,
      type: typeof body.type === 'string' && body.type.trim() ? body.type.trim() : 'team',
      description: typeof body.description === 'string' ? body.description.trim() : '',
      color: typeof body.color === 'string' && body.color.trim() ? body.color.trim() : 'primary',
      icon: typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : 'users',
      capabilities: normalizeStringArray(body.capabilities), members,
    };
  }
}
