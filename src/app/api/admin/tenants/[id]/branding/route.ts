import { NextRequest } from 'next/server';
import { handleAdminBranding } from '@/server/branding/branding.controller';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleAdminBranding(_request, id, 'GET');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleAdminBranding(request, id, 'PATCH');
}

