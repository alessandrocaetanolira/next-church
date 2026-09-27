import { auth } from '@/auth';
import { saveTenantDataUrl } from '@/lib/server/tenant-file-storage';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError, ValidationError } from '@/lib/http/errors';

export async function POST(request: Request) {
  try {
    const session = await auth();
    const tenantSlug = session?.user?.tenantSlug;
    if (!session?.user?.tenantId || !tenantSlug) throw new UnauthenticatedError();

    const body = await request.json() as { module?: unknown; dataUrl?: unknown };
    if (body.module !== 'feed' || typeof body.dataUrl !== 'string') {
      throw new ValidationError('Arquivo de Feed inválido.');
    }

    return jsonOk({ url: await saveTenantDataUrl(tenantSlug, 'feed', body.dataUrl) });
  } catch (error) {
    return jsonError(error);
  }
}
