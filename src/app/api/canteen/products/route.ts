import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { createProduct, getProductsContext, listProducts } from '@/server/canteen/products.controller';

async function getContext(action: 'catalog' | 'manage') {
  const session = await auth();
  return getProductsContext(session?.user, action);
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
