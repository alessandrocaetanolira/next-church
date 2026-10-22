import { handlers } from "@/auth";
import type { NextRequest } from 'next/server';
import { protectPublicAuthRequest } from '@/lib/server/public-auth-rate-limit';

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  if (/^\/api\/auth\/(?:callback|signin)\/credentials\/?$/.test(request.nextUrl.pathname)) {
    return protectPublicAuthRequest(request, 'login', handlers.POST);
  }
  return handlers.POST(request);
}
