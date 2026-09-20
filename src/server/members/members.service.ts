import { generateId } from '@/lib/id';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/http/errors';
import { normalizeMemberInput, validateMemberInput } from '@/features/members/lib/member-registration';
import { MembersRepository } from './members.repository';

export class MembersService {
  constructor(private readonly repository: MembersRepository) {}

  list() { return this.repository.list(); }

  async get(id: string) {
    const member = await this.repository.findById(id);
    if (!member) throw new NotFoundError('Membro não encontrado.');
    return member;
  }

  async create(input: unknown) {
    const data = normalizeMemberInput(input as Record<string, unknown>);
    const validationError = validateMemberInput(data);
    if (validationError) throw new ValidationError(validationError);
    if (await this.repository.findByEmail(data.email)) throw new ConflictError('Este email já está cadastrado.');

    return this.repository.create({
      id: generateId(), name: data.name, email: data.email, phone: data.phone,
      parentPhone: data.parentPhone, birthDate: data.birthDate, conversionDate: data.conversionDate,
      baptismDate: data.baptismDate, previousChurch: data.previousChurch, aboutMe: data.aboutMe,
      maritalStatus: data.maritalStatus, approved: data.approved ?? true,
    });
  }

  async update(id: string, input: unknown) {
    await this.get(id);
    const data = normalizeMemberInput(input as Record<string, unknown>);
    const validationError = validateMemberInput(data);
    if (validationError) throw new ValidationError(validationError);
    return this.repository.update(id, {
      name: data.name, email: data.email, phone: data.phone, parentPhone: data.parentPhone,
      birthDate: data.birthDate, conversionDate: data.conversionDate, baptismDate: data.baptismDate,
      previousChurch: data.previousChurch, aboutMe: data.aboutMe, maritalStatus: data.maritalStatus,
      approved: data.approved ?? true,
    });
  }

  async remove(id: string) {
    await this.get(id);
    await this.repository.softDelete(id);
    return { success: true };
  }
}
