import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { deleteProduct, getProductsContext, updateProduct } from '@/server/canteen/products.controller';

async function getContext() {
  const session = await auth();
  return getProductsContext(session?.user, 'manage');
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await updateProduct(await getContext(), (await params).id, await request.json())); } catch (error) { return jsonError(error); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return jsonOk(await deleteProduct(await getContext(), (await params).id)); } catch (error) { return jsonError(error); }
}
