import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { canAccessRoute, hasPlanFeature } from "@/lib/access-control";
import { getPlanFeatureForPath } from "@/lib/plan-features";

export async function proxy(request: NextRequest) {
  const { nextUrl } = request;
  if (nextUrl.pathname === "/manifest.webmanifest") {
    return NextResponse.next();
  }

  if (nextUrl.pathname.startsWith("/serwist/")) {
    return NextResponse.next();
  }

  if (nextUrl.pathname.startsWith("/api/auth") || nextUrl.pathname.startsWith("/api/public")) {
    return NextResponse.next();
  }

  const isPublicRoute =
    nextUrl.pathname.startsWith("/auth/login") ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/public") ||
    nextUrl.pathname.startsWith("/pwa-start") ||
    nextUrl.pathname.startsWith("/offline") ||
    nextUrl.pathname.startsWith("/branding/") ||
    nextUrl.pathname.startsWith("/pwa-") ||
    nextUrl.pathname.startsWith("/cadastro");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const session = await auth();
  const token = session?.user;

  if (nextUrl.pathname.startsWith("/api/")) {
    const planFeature = getPlanFeatureForPath(nextUrl.pathname);
    if (token && planFeature && !hasPlanFeature(token, planFeature)) {
      return NextResponse.json({ error: "Recurso não disponível no plano atual." }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/admin") && !token.isPlatformAdmin) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (!nextUrl.pathname.startsWith("/admin") && token.isPlatformAdmin) {
    return NextResponse.redirect(new URL("/admin/tenants", nextUrl));
  }

  if (!canAccessRoute(token, nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest).*)"],
};
