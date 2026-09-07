'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useCallback } from 'react';

export function useQuiz() {
  const questions = useLiveQuery(() => db.quizQuestions.toArray(), []);

  const saveAttempt = useCallback(async (userId: string, userName: string, score: number, total: number, correct: number) => {
    await db.quizAttempts.add({
      userId,
      userName,
      score,
      totalQuestions: total,
      correctAnswers: correct,
      completedAt: new Date().toISOString()
    });
  }, []);

  return { questions: questions || [], saveAttempt };
}
