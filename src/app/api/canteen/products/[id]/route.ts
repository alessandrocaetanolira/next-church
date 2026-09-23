import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { deleteProduct, updateProduct } from '@/server/canteen/products.controller';
import { CanteenProductsRepository } from '@/server/canteen/products.repository';
import { CanteenProductsService } from '@/server/canteen/products.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  return {
    user: session.user,
    service: new CanteenProductsService(
      new CanteenProductsRepository(prisma),
      session.user.tenantSlug ?? session.user.tenantId,
    ),
  };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await updateProduct(await getContext(), (await params).id, await request.json())); } catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await deleteProduct(await getContext(), (await params).id)); } catch (error) { return jsonError(error); }
}
