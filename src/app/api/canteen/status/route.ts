import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getCanteenStatus, getOperationContext, setCanteenStatus } from '@/server/canteen/operation.controller';

export async function GET() {
  try {
    const context = getOperationContext((await auth())?.user, 'view');
    return jsonOk(await getCanteenStatus(context.user, context.service));
  } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request) {
  try {
    const context = getOperationContext((await auth())?.user, 'operate');
    const user = context.user;
    return jsonOk(await setCanteenStatus(user, context.service, await request.json(), user.email ?? user.name ?? null));
  } catch (error) { return jsonError(error); }
}
