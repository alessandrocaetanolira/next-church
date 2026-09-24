import { apiRequest } from '@/services/api/client';

export type QuizAttempt = {
  id: string;
  userId: string;
  userName: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
};

export function listQuizAttempts() { return apiRequest<QuizAttempt[]>('/api/quiz/attempts', { cache: 'no-store' }); }
export function createQuizAttempt(input: Omit<QuizAttempt, 'id'>) { return apiRequest<QuizAttempt>('/api/quiz/attempts', { method: 'POST', body: JSON.stringify(input) }); }
