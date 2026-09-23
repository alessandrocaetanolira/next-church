import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TenantService } from "@/lib/tenant-service";

/**
 * Middleware manual de proteção para Super Admins.
 * TODO: Implementar flag 'isSuperAdmin' no GlobalUser futuramente.
 */
async function validateSuperAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  
  // Apenas administradores globais autenticados podem gerenciar tenants.
  if (!(session.user as { isPlatformAdmin?: boolean }).isPlatformAdmin) return null;
  
  return session;
}

/**
 * GET /api/admin/tenants
 * Lista todos os tenants.
 */
export async function GET() {
  const session = await validateSuperAdmin();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const tenants = await TenantService.listTenants();
    return NextResponse.json(tenants);
  } catch (error) {
    console.error("API Error (List Tenants):", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * POST /api/admin/tenants
 * Cria um novo tenant e provisiona seu banco de dados.
 */
export async function POST(req: NextRequest) {
  const session = await validateSuperAdmin();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { slug, name, adminEmail, adminPassword } = await req.json();

    if (!slug || !name || !adminEmail || !adminPassword) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const church = await TenantService.createTenant(slug, name, adminEmail, adminPassword);
    return NextResponse.json(church);
  } catch (error: any) {
    console.error("API Error (Create Tenant):", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
