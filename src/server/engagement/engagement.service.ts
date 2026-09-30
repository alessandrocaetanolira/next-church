import { ValidationError } from '@/lib/http/errors';
import { getChallengePointsForIds } from '@/lib/devotional';
import { EngagementRepository, type EngagementProfile } from './engagement.repository';

function dayKey(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
function yesterdayKey() { return dayKey(new Date(Date.now() - 86400000)); }

export class EngagementService {
  constructor(private readonly repository: EngagementRepository) {}

  async get(userEmail: string) {
    const email = this.email(userEmail);
    const profile = await this.repository.findOrCreate(email);
    return this.summary(profile, email);
  }

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
    return this.summary({ ...profile, devotionalStreak: streak, devotionalLastDate: lastDate, completedChallengeIds: JSON.stringify(completed) }, email);
  }

  async recordGameScore(userEmail: string, userName: string | null | undefined, input: unknown) {
    const email = this.email(userEmail);
    const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const gameId = typeof body.gameId === 'string' ? body.gameId.trim().toLowerCase() : '';
    const runId = typeof body.runId === 'string' ? body.runId.trim() : '';
    const score = Number(body.score);
    if (!/^[a-z0-9][a-z0-9_-]{1,48}$/.test(gameId)) throw new ValidationError('Jogo inválido.');
    if (!/^[a-zA-Z0-9_-]{8,100}$/.test(runId)) throw new ValidationError('Identificador da partida inválido.');
    if (!Number.isInteger(score) || score < 0 || score > 1000) throw new ValidationError('Pontuação inválida.');
    const maxScoreByGame: Record<string, number> = { 'quiz-bomba': 410 };
    if (maxScoreByGame[gameId] !== undefined && score > maxScoreByGame[gameId]) throw new ValidationError('Pontuação incompatível com o jogo.');
    const completedAt = body.completedAt ? new Date(String(body.completedAt)) : new Date();
    if (Number.isNaN(completedAt.getTime())) throw new ValidationError('Data da partida inválida.');
    if (await this.repository.findGameScoreByRunId(runId)) return this.get(email);
    await this.repository.createGameScore({ userId: email, userName: userName?.trim() || 'Jogador', gameId, runId, score, completedAt });
    return this.get(email);
  }

  private async summary(profile: EngagementProfile, currentEmail: string) {
    const completed = this.parseIds(profile.completedChallengeIds);
    const repository = this.repository as EngagementRepository & {
      listScores?: () => Promise<Array<{ userId: string; score: number }>>;
    };
    const quizScores = typeof repository.listQuizScores === 'function'
      ? await repository.listQuizScores()
      : await repository.listScores?.() ?? [];
    const gameScores = typeof repository.listGameScores === 'function' ? await repository.listGameScores() : [];
    const profiles = typeof repository.listEngagementProfiles === 'function'
      ? await repository.listEngagementProfiles()
      : [{ userEmail: profile.userEmail, completedChallengeIds: profile.completedChallengeIds }];
    const members = typeof repository.listApprovedMembers === 'function'
      ? await repository.listApprovedMembers()
      : Array.from(new Set([currentEmail, ...quizScores.map((item) => item.userId)])).map((email) => ({
          memberId: email,
          memberName: email,
          memberEmail: email,
          userEmail: email,
        }));
    const devotionalByEmail = new Map(profiles.map((item) => [item.userEmail.trim().toLowerCase(), this.getProfilePoints(item.completedChallengeIds)]));
    const gameByEmail = new Map<string, { points: number; games: number }>();
    [...quizScores, ...gameScores].forEach((attempt) => {
      const email = attempt.userId.trim().toLowerCase();
      const current = gameByEmail.get(email) ?? { points: 0, games: 0 };
      current.points += Math.max(0, Number(attempt.score) || 0);
      current.games += 1;
      gameByEmail.set(email, current);
    });
    const leaderboard = members.map((member) => {
      const email = member.userEmail.trim().toLowerCase();
      const devotionalPoints = devotionalByEmail.get(email) ?? 0;
      const game = gameByEmail.get(email) ?? { points: 0, games: 0 };
      return { ...member, devotionalPoints, gamePoints: game.points, points: devotionalPoints + game.points, gamesPlayed: game.games };
    }).sort((a, b) => b.points - a.points || a.memberName.localeCompare(b.memberName, 'pt-BR'));
    const rankIndex = leaderboard.findIndex((item) => item.userEmail.trim().toLowerCase() === currentEmail.trim().toLowerCase());
    const current = leaderboard[rankIndex];
    return {
      devotionalStreak: profile.devotionalStreak,
      devotionalLastDate: profile.devotionalLastDate,
      devotionalReadToday: profile.devotionalLastDate === dayKey(),
      completedChallengeIds: completed,
      devotionalPoints: this.getProfilePoints(profile.completedChallengeIds),
      gamePoints: current?.gamePoints ?? 0,
      points: current?.points ?? this.getProfilePoints(profile.completedChallengeIds),
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      leaderboard,
    };
  }

  private parseIds(value: string | null | undefined) { try { const parsed = JSON.parse(value ?? '[]'); return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : []; } catch { return []; } }
  private getProfilePoints(value: string | null | undefined) { return getChallengePointsForIds(this.parseIds(value)); }
  private email(value: string) { const email = value.trim().toLowerCase(); if (!email) throw new ValidationError('Usuário não identificado.'); return email; }
}
