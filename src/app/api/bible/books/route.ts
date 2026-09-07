import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const tenantId = (session.user as any).tenantId;
  const prisma = getTenantClient(tenantId);

  try {
    const books = await prisma.book.findMany({
      orderBy: { id: 'asc' }, // Ajustar se quiser ordenação bíblica
      select: { id: true, name: true, abbrev: true, testament: true }
    });
    return NextResponse.json(books);
  } catch (error) {
    return new NextResponse("Error fetching books", { status: 500 });
  }
}
