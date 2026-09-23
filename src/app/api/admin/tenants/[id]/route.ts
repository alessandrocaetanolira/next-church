import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { TenantService } from "@/lib/tenant-service";

/**
 * Valida super administrador.
 */
async function validateSuperAdmin() {
  const session = await auth();
  if (!(session?.user as { isPlatformAdmin?: boolean } | undefined)?.isPlatformAdmin) return null;
  return session;
}

/**
 * PATCH /api/admin/tenants/[id]
 * Atualiza um tenant.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await validateSuperAdmin();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  try {
    const data = await req.json();
    const updated = await TenantService.updateTenant(id, data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error(`API Error (Update Tenant ${id}):`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await validateSuperAdmin();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await params;
  const tenant = await TenantService.getTenant(id);
  if (!tenant) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(tenant);
}

/**
 * DELETE /api/admin/tenants/[id]
 * Inativa (Soft delete) um tenant.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await validateSuperAdmin();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  try {
    const deleted = await TenantService.deleteTenant(id);
    return NextResponse.json(deleted);
  } catch (error) {
    console.error(`API Error (Delete Tenant ${id}):`, error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
