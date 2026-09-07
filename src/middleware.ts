import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { canAccessRoute } from "@/lib/access-control";

export async function middleware(request: NextRequest) {
  const { nextUrl } = request;
  if (nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isPublicRoute =
    nextUrl.pathname.startsWith("/auth/login") ||
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

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", nextUrl));
  }

  if (!canAccessRoute(token, nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  if (nextUrl.pathname.startsWith("/admin") && token.email !== "admin@teste.com") {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/sync|_next/static|_next/image|favicon.ico).*)"],
};
