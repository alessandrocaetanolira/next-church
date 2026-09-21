import { QuizPolicy } from './quiz.policy';
import { QuizService } from './quiz.service';

type User = Parameters<typeof QuizPolicy.assertView>[0];

export function listQuizQuestions(user: User, service: QuizService) { QuizPolicy.assertView(user); return service.listQuestions(); }
export function listQuizAttempts(user: User, service: QuizService) { QuizPolicy.assertView(user); return service.listAttempts(); }
export function createQuizAttempt(user: User, service: QuizService, input: unknown) { QuizPolicy.assertSubmit(user); return service.createAttempt(user, input); }
