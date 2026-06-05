import { auth } from "@/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth"];
const AUDITOR_READONLY = ["/audit", "/api/audit"];

// Role → allowed route prefixes
const ROLE_ROUTES: Record<string, string[]> = {
  admin:   ["/*"],
  manager: ["/dashboard", "/crm", "/onboarding", "/assets", "/properties", "/maintenance",
             "/insurance", "/compliance", "/communications", "/revenue", "/trust",
             "/audit", "/workflow", "/ai", "/receipts", "/closeout",
             "/api/leads", "/api/work-orders", "/api/leases", "/api/invoices", "/api/trust",
             "/api/receipts-generate", "/api/upload", "/api/ai-summary"],
  owner:   ["/dashboard", "/properties", "/trust", "/receipts", "/api/trust", "/api/receipts-generate"],
  auditor: ["/audit", "/api/audit"],
  vendor:  ["/maintenance", "/api/work-orders"],
  tenant:  ["/properties", "/communications"],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Get session
  const session = await auth();

  // Not logged in → redirect to login
  if (!session?.user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  const user = session.user as any;

  // Multi-tenant: API routes must match the user's companyId
  // (enforced again server-side in each handler, this is belt-and-suspenders)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const companyHeader = request.headers.get("x-company-id");
    if (companyHeader && companyHeader !== user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Auditors get read-only access — block any non-GET on API routes
  if (user.role === "auditor" && pathname.startsWith("/api/") && request.method !== "GET") {
    return NextResponse.json({ error: "Auditors have read-only access" }, { status: 403 });
  }

  // Admin passes all checks
  if (user.role === "admin") return NextResponse.next();

  // Role-based route access
  const allowed = ROLE_ROUTES[user.role] ?? [];
  const hasAccess = allowed.some((pattern) =>
    pattern === "/*" || pathname.startsWith(pattern)
  );

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Attach company context to all downstream requests
  const response = NextResponse.next();
  response.headers.set("x-company-id", user.companyId);
  response.headers.set("x-user-id", user.id);
  response.headers.set("x-user-role", user.role);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
