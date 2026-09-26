'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useQuiz() {
  const { data: session } = useSession();
  const tenantId = session?.user?.tenantId ?? '';
  const questions = useLiveQuery(() => db.quizQuestions.toArray(), []);

  const saveAttempt = useCallback(async (userId: string, userName: string, score: number, total: number, correct: number) => {
    await db.quizAttempts.add({
      userId,
      tenantId,
      userName,
      score,
      totalQuestions: total,
      correctAnswers: correct,
      completedAt: new Date().toISOString()
    });
  }, [tenantId]);

  return { questions: questions || [], saveAttempt };
}
