import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) return Response.json({ error: 'Push indisponível.' }, { status: 503 });
  return Response.json({ publicKey }, { headers: { 'Cache-Control': 'no-store' } });
}
