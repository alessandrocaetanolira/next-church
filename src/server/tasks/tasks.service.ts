import { ValidationError } from '@/lib/http/errors';
import { TasksRepository } from './tasks.repository';

export class TasksService {
  constructor(private readonly repository: TasksRepository) {}

  list(teamIds?: string[]) { return this.repository.list(teamIds); }

  create(input: unknown) {
    return this.repository.create(this.normalize(input));
  }

  sync(action: 'create' | 'update' | 'delete', input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) throw new ValidationError('Identificador da tarefa é obrigatório.');
    if (action === 'delete') return this.repository.softDelete(id);
    return this.repository.upsert({ id, ...this.normalize(input) });
  }

  syncLegacy(action: 'create' | 'update' | 'delete', input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) throw new ValidationError('Identificador da tarefa é obrigatório.');
    if (action === 'delete') return this.repository.softDelete(id);
    return this.repository.upsert({
      id,
      title: typeof body.title === 'string' ? body.title : '',
      teamId: typeof body.teamId === 'string' ? body.teamId : '',
      type: typeof body.type === 'string' ? body.type : 'general',
      date: typeof body.date === 'string' && !Number.isNaN(new Date(body.date).getTime()) ? new Date(body.date) : new Date(),
      description: typeof body.description === 'string' ? body.description : null,
      assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo : null,
      status: typeof body.status === 'string' ? body.status : 'pending',
      recurrence: typeof body.recurrence === 'string' ? body.recurrence : 'none',
    });
  }

  private normalize(input: unknown) {
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const teamId = typeof body.teamId === 'string' ? body.teamId.trim() : '';
    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const dateValue = typeof body.date === 'string' ? new Date(body.date) : null;
    if (!title || !teamId || !type || !dateValue || Number.isNaN(dateValue.getTime())) {
      throw new ValidationError('Título, equipe, tipo e data são obrigatórios.');
    }

    return {
      title,
      teamId,
      type,
      date: dateValue,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      assignedTo: typeof body.assignedTo === 'string' && body.assignedTo.trim() ? body.assignedTo.trim() : null,
      status: typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'pending',
      recurrence: typeof body.recurrence === 'string' && body.recurrence.trim() ? body.recurrence.trim() : 'none',
    };
  }
}
