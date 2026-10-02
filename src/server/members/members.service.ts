import { generateId } from '@/lib/id';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/http/errors';
import { normalizeMemberInput, validateMemberInput } from '@/features/members/lib/member-registration';
import { MembersRepository } from './members.repository';
import { EngagementService } from '@/server/engagement/engagement.service';

export class MembersService {
  constructor(private readonly repository: MembersRepository) {}

  list() { return this.repository.list(); }

  async get(id: string) {
    const member = await this.repository.findById(id);
    if (!member) throw new NotFoundError('Membro não encontrado.');
    return member;
  }

  async getPublicProfile(id: string) {
    const profile = await this.repository.findPublicProfile(id);
    if (!profile) return null;
    const { email: _email, ...publicProfile } = profile;
    return publicProfile;
  }

  async getPublicProfileWithEngagement(id: string, engagement: EngagementService) {
    const profile = await this.repository.findPublicProfile(id);
    if (!profile) return null;
    const summary = await engagement.get(profile.email);
    const { email: _email, ...publicProfile } = profile;
    const leaderboard = summary.leaderboard ?? [];
    const rankingEntry = leaderboard.find((item) => item.memberId === id);
    return {
      ...publicProfile,
      engagement: {
        points: rankingEntry?.points ?? summary.points ?? 0,
        rank: rankingEntry ? leaderboard.findIndex((item) => item.memberId === id) + 1 : null,
        devotionalPoints: rankingEntry?.devotionalPoints ?? 0,
        gamePoints: rankingEntry?.gamePoints ?? 0,
        gamesPlayed: rankingEntry?.gamesPlayed ?? 0,
      },
    };
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
