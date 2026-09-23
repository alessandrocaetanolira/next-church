import { NextRequest } from 'next/server';
import { handlePublicBranding } from '@/server/branding/branding.controller';

export async function GET(request: NextRequest) {
  return handlePublicBranding(request.nextUrl.searchParams.get('igreja')?.trim().toLowerCase() ?? null);
}
