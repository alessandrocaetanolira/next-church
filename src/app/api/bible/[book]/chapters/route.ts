import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ book: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { book } = await context.params;
  const tenantId = (session.user as any).tenantId;
  const prisma = getTenantClient(tenantId);

  try {
    const bookData = await prisma.book.findUnique({
      where: { abbrev: book },
      include: { chapters: { select: { number: true }, orderBy: { number: 'asc' } } }
    });

    if (!bookData) return new NextResponse("Not Found", { status: 404 });

    return NextResponse.json(bookData.chapters.map(c => c.number));
  } catch (error) {
    return new NextResponse("Error fetching chapters", { status: 500 });
  }
}
