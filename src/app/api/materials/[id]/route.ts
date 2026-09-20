import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { deleteMaterial, updateMaterial, updateMaterialQuantity } from '@/server/materials/materials.controller';
import { MaterialsRepository } from '@/server/materials/materials.repository';
import { MaterialsService } from '@/server/materials/materials.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return { user: session.user, service: new MaterialsService(new MaterialsRepository(prisma)) };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await updateMaterial(await getContext(), (await params).id, await request.json())); } catch (error) { return jsonError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await updateMaterialQuantity(await getContext(), (await params).id, await request.json())); } catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await deleteMaterial(await getContext(), (await params).id)); } catch (error) { return jsonError(error); }
}
