import { NextResponse } from 'next/server';
import { getTenantClient } from '@/lib/prisma-factory';

export async function GET() {
  const prisma = getTenantClient('igreja-teste');
  try {
    await prisma.member.createMany({
      data: [
        { name: 'João Silva', email: 'joao@email.com', phone: '11999999999', approved: true },
        { name: 'Maria Souza', email: 'maria@email.com', phone: '11999999998', approved: true },
        { name: 'Pedro Santos', email: 'pedro@email.com', phone: '11999999997', approved: true },
      ]
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
