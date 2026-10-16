import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { pullSync } from '@/server/sync/sync-pull.controller';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const response = jsonOk(await pullSync(session?.user, new URL(request.url).searchParams.get('lastSync')));
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) { return jsonError(error); }
}
