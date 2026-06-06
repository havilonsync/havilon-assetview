import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth", "/api/stripe/webhook"];

const ROLE_ROUTES: Record<string, string[]> = {
  admin:   ["/"],
  manager: ["/dashboard","/crm","/onboarding","/assets","/properties","/maintenance",
             "/insurance","/compliance","/communications","/revenue","/trust",
             "/audit","/workflow","/ai","/receipts","/closeout","/api/"],
  owner:   ["/dashboard","/properties","/trust","/receipts"],
  auditor: ["/audit","/api/audit-log"],
  vendor:  ["/maintenance"],
  tenant:  ["/properties","/communications"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authCookieName =
    request.cookies.has("__Secure-authjs.session-token")
      ? "__Secure-authjs.session-token"
      : request.cookies.has("authjs.session-token")
      ? "authjs.session-token"
      : request.cookies.has("__Secure-next-auth.session-token")
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: request.nextUrl.protocol === "https:",
    cookieName: authCookieName,
  });
  const user = token as
    | {
    sub?: string;
    id?: string;
    role?: string;
    companyId?: string;
    }
    | undefined;
  const userId = user?.id ?? user?.sub;

  if (pathname.startsWith("/login")) {
    if (userId) {
      console.error("[middleware] authenticated user hit /login; redirecting to /dashboard", {
        userId,
        role: user?.role,
      });
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) return NextResponse.next();

  if (!userId) {
    console.error("[middleware] unauthorized request; redirecting to /login", {
      pathname,
      hasAuthCookie:
        request.cookies.has("authjs.session-token") ||
        request.cookies.has("__Secure-authjs.session-token") ||
        request.cookies.has("next-auth.session-token") ||
        request.cookies.has("__Secure-next-auth.session-token"),
    });
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (user.role === "admin") return NextResponse.next();

  const allowed = (ROLE_ROUTES[user.role as string] ?? []);
  const hasAccess = allowed.some((p: string) => p === "/" || pathname.startsWith(p));
  if (!hasAccess) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("x-user-id", userId ?? "");
  response.headers.set("x-user-role", String(user.role ?? ""));
  response.headers.set("x-company-id", String(user.companyId ?? ""));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|_next/webpack-hmr).*)"],
};
