import { auth } from '@/auth';
import { getTenantClient } from '@/lib/prisma-factory';
import { jsonError, jsonOk } from '@/lib/http/response';
import { UnauthenticatedError } from '@/lib/http/errors';
import { createProduct, listProducts } from '@/server/canteen/products.controller';
import { CanteenProductsPolicy } from '@/server/canteen/products.policy';
import { CanteenProductsRepository } from '@/server/canteen/products.repository';
import { CanteenProductsService } from '@/server/canteen/products.service';

async function getContext(action?: 'catalog' | 'manage') {
  const session = await auth();
  if (!session?.user?.tenantId) throw new UnauthenticatedError();
  if (action === 'catalog') CanteenProductsPolicy.assertCatalog(session.user);
  if (action === 'manage') CanteenProductsPolicy.assertManage(session.user);
  const prisma = getTenantClient(session.user.tenantId);
  return {
    user: session.user,
    service: new CanteenProductsService(
      new CanteenProductsRepository(prisma),
      session.user.tenantSlug ?? session.user.tenantId,
    ),
  };
}

export async function GET(request: Request) {
  try {
    const context = await getContext('catalog');
    return jsonOk(await listProducts(context));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const context = await getContext('manage');
    return jsonOk(await createProduct(context, await request.json()), 201);
  } catch (error) { return jsonError(error); }
}
