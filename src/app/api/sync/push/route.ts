import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { ValidationError } from '@/lib/http/errors';
import { pushSync } from '@/server/sync/sync-push.controller';

export async function POST(request: Request) {
  try {
    const session = await auth();
    let input: unknown;
    try { input = await request.json(); } catch { throw new ValidationError('JSON inválido.'); }
    return jsonOk(await pushSync(session?.user, input));
  } catch (error) { return jsonError(error); }
}
