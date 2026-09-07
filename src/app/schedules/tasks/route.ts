import { NextRequest, NextResponse } from "next/server";
import { getTenantClient } from "@/lib/prisma-factory";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const tenantId = (session.user as any).tenantId;
  const prisma = getTenantClient(tenantId);
  const tasks = await prisma.task.findMany({ where: { deletedAt: null } });
  return NextResponse.json(tasks);
}
