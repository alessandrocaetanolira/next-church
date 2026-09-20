import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";
import { hasActionPermission } from "@/lib/access-control";

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ book: string; chapter: string }> }
) {
  console.log("DEBUG: Rota da bíblia alcançada!");
  const session = await auth();
  console.log("DEBUG: Sessão encontrada:", !!session);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!hasActionPermission(session.user, 'bible', 'view')) return new NextResponse("Forbidden", { status: 403 });

  const params = await context.params;
  const { book, chapter } = params;
  
  // Mapeamento simples para garantir que slugs funcionem
  const bookMap: Record<string, string> = {
    'gênesis': 'gn', 'exodo': 'ex', 'êxodo': 'ex', 'levítico': 'lv', 'números': 'nm',
    'deuteronômio': 'dt', 'josué': 'js', 'juízes': 'jz', 'rute': 'rt', '1-samuel': '1sm'
    // ... adicionei os principais, o resto segue o padrão abbrev
  };

  const abbrev = bookMap[book.toLowerCase()] || book.toLowerCase();
  
  const tenantId = (session.user as any).tenantId;
  const prisma = getTenantClient(tenantId);

  try {
    const bookData = await prisma.book.findUnique({
      where: { abbrev: abbrev },
      include: {
        chapters: {
          where: { number: parseInt(chapter) },
          include: { verses: { orderBy: { number: 'asc' } } }
        }
      }
    });

    if (!bookData || bookData.chapters.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json({
      book: bookData.name,
      chapter: bookData.chapters[0].number,
      verses: bookData.chapters[0].verses.map(v => v.text)
    });
  } catch (error) {
    console.error('API Bible Error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
