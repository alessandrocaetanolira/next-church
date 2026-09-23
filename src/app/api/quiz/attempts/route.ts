import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createQuizAttempt, listQuizAttempts } from '@/server/quiz/quiz.controller';
import { QuizRepository } from '@/server/quiz/quiz.repository';
import { QuizService } from '@/server/quiz/quiz.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return { user: session.user, service: new QuizService(new QuizRepository(prisma)) };
}

export async function GET() {
  try { const context = await getContext(); return jsonOk(await listQuizAttempts(context.user, context.service)); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { const context = await getContext(); return jsonOk(await createQuizAttempt(context.user, context.service, await request.json()), 201); }
  catch (error) { return jsonError(error); }
}
