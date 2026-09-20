import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createMaterial, listMaterials } from '@/server/materials/materials.controller';
import { MaterialsRepository } from '@/server/materials/materials.repository';
import { MaterialsService } from '@/server/materials/materials.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new MaterialsService(new MaterialsRepository(prisma)) };
}

export async function GET(_request: Request) {
  try { return jsonOk(await listMaterials(await getContext())); } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { return jsonOk(await createMaterial(await getContext(), await request.json()), 201); } catch (error) { return jsonError(error); }
}
