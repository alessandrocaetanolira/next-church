import { ValidationError } from '@/lib/http/errors';
import { CanteenOperationRepository } from './operation.repository';

export class CanteenOperationService {
  constructor(private readonly repository: CanteenOperationRepository) {}

  getStatus() { return this.repository.getStatus(); }

  setStatus(input: unknown, updatedBy: string | null) {
    const body = (input && typeof input === 'object' ? input : {}) as { isOpen?: unknown };
    if (typeof body.isOpen !== 'boolean') throw new ValidationError('Informe isOpen como booleano.');
    return this.repository.setStatus(body.isOpen, updatedBy);
  }
}
