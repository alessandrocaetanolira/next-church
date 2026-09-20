import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessRoute } from "@/lib/access-control";
import { getPlanFeatureForPath } from "@/lib/plan-features";
import { hasPlanFeature } from "@/lib/access-control";

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  if (nextUrl.pathname === "/sw.js" || nextUrl.pathname === "/manifest.webmanifest") {
    return NextResponse.next();
  }

  if (nextUrl.pathname.startsWith("/api/auth") || nextUrl.pathname.startsWith("/api/public")) {
    return NextResponse.next();
  }

  const isPublicRoute =
    nextUrl.pathname.startsWith("/auth/login") ||
    nextUrl.pathname.startsWith("/admin/login") ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/public") ||
    nextUrl.pathname.startsWith("/cadastro");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  if (nextUrl.pathname.startsWith('/api/')) {
    const planFeature = getPlanFeatureForPath(nextUrl.pathname);
    if (token && planFeature && !hasPlanFeature(token, planFeature)) {
      return NextResponse.json({ error: 'Recurso não disponível no plano atual.' }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL(nextUrl.pathname.startsWith('/admin') ? "/admin/login" : "/auth/login", nextUrl));
  }

  if (nextUrl.pathname.startsWith('/admin') && !token.isPlatformAdmin) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (!nextUrl.pathname.startsWith('/admin') && token.isPlatformAdmin) {
    return NextResponse.redirect(new URL("/admin/tenants", nextUrl));
  }

  if (!canAccessRoute(token, nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest).*)"],
};
