import { apiRequest } from '@/services/api/client';

export type EngagementProfile = {
  devotionalStreak?: number;
  points?: number;
  rank?: number | null;
  devotionalReadToday?: boolean;
  completedChallengeIds?: Array<string | number>;
};

export function getEngagementProfile() {
  return apiRequest<EngagementProfile>('/api/engagement/profile', { cache: 'no-store' });
}

export function updateEngagementProfile(input: { action: 'markDevotionalRead' } | { action: 'completeChallenge'; devotionalId: string | number }) {
  return apiRequest<EngagementProfile>('/api/engagement/profile', { method: 'PATCH', body: JSON.stringify(input) });
}
