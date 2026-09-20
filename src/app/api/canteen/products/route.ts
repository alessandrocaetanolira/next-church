import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { ensureTenantSchemaExtensions } from '@/lib/tenant-schema';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createProduct, listProducts } from '@/server/canteen/products.controller';
import { CanteenProductsRepository } from '@/server/canteen/products.repository';
import { CanteenProductsService } from '@/server/canteen/products.service';

async function getContext() {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  const prisma = getTenantClient(session.user.tenantId);
  await ensureTenantSchemaExtensions(prisma);
  return {
    user: session.user,
    service: new CanteenProductsService(
      new CanteenProductsRepository(prisma),
      session.user.tenantSlug ?? session.user.tenantId,
    ),
  };
}

export async function GET(request: Request) {
  try { return jsonOk(await listProducts(await getContext())); } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try { return jsonOk(await createProduct(await getContext(), await request.json()), 201); } catch (error) { return jsonError(error); }
}
