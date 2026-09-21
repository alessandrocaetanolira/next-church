import { ValidationError } from '@/lib/http/errors';
import { getChallengePointsForIds } from '@/lib/devotional';
import { EngagementRepository, type EngagementProfile } from './engagement.repository';

function dayKey(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
function yesterdayKey() { return dayKey(new Date(Date.now() - 86400000)); }

export class EngagementService {
  constructor(private readonly repository: EngagementRepository) {}

  async get(userEmail: string) { const profile = await this.repository.findOrCreate(this.email(userEmail)); return this.summary(profile, await this.repository.listScores()); }

  async update(userEmail: string, input: unknown) {
    const email = this.email(userEmail);
    const profile = await this.repository.findOrCreate(email);
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    let streak = profile.devotionalStreak;
    let lastDate = profile.devotionalLastDate;
    const completed = this.parseIds(profile.completedChallengeIds);
    const today = dayKey();
    if (body.action === 'markDevotionalRead') {
      if (lastDate !== today) { streak = lastDate === yesterdayKey() ? streak + 1 : 1; lastDate = today; }
    } else if (body.action === 'completeChallenge') {
      if (typeof body.devotionalId !== 'number') throw new ValidationError('Desafio inválido.');
      if (!completed.includes(body.devotionalId)) completed.push(body.devotionalId);
    } else throw new ValidationError('Ação inválida.');
    await this.repository.updateProfile(profile.id, streak, lastDate, completed);
    return this.summary({ ...profile, devotionalStreak: streak, devotionalLastDate: lastDate, completedChallengeIds: JSON.stringify(completed) }, await this.repository.listScores());
  }

  private summary(profile: EngagementProfile, attempts: Array<{ userId: string; score: number }>) {
    const completed = this.parseIds(profile.completedChallengeIds);
    const ranking = new Map<string, number>();
    attempts.forEach((attempt) => ranking.set(attempt.userId, (ranking.get(attempt.userId) ?? 0) + attempt.score));
    const ordered = [...ranking.entries()].sort((a, b) => b[1] - a[1]);
    const rankIndex = ordered.findIndex(([userId]) => userId === profile.userEmail);
    const gamePoints = ranking.get(profile.userEmail) ?? 0;
    return { devotionalStreak: profile.devotionalStreak, devotionalLastDate: profile.devotionalLastDate, devotionalReadToday: profile.devotionalLastDate === dayKey(), completedChallengeIds: completed, devotionalPoints: getChallengePointsForIds(completed), gamePoints, points: getChallengePointsForIds(completed) + gamePoints, rank: rankIndex >= 0 ? rankIndex + 1 : null };
  }

  private parseIds(value: string | null | undefined) { try { const parsed = JSON.parse(value ?? '[]'); return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : []; } catch { return []; } }
  private email(value: string) { const email = value.trim().toLowerCase(); if (!email) throw new ValidationError('Usuário não identificado.'); return email; }
}
