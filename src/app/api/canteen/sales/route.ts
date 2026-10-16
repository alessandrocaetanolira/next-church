import { auth } from '@/auth';
import { jsonError, jsonOk } from '@/lib/http/response';
import { getSalesContext, listSales, createSale } from '@/server/canteen/sales.controller';

export async function GET() {
  try {
    const session = await auth();
    return jsonOk(await listSales(getSalesContext(session?.user, 'view')));
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const context = getSalesContext(session?.user, 'create');
    return jsonOk(await createSale(context, await request.json()));
  } catch (error) { return jsonError(error); }
}
