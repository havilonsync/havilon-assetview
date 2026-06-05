import { auth } from "@/auth/config";
import { prisma } from "@/lib/db/prisma";
import { NextResponse } from "next/server";

export interface AuthContext {
  userId: string;
  companyId: string;
  role: string;
  email: string;
}

/** Use in Server Components */
export async function getServerSession(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as any;
  return { userId: user.id, companyId: user.companyId, role: user.role, email: user.email ?? "" };
}

/** Use in API Route handlers */
export async function requireAuth(request: Request): Promise<AuthContext | NextResponse> {
  const ctx = await getServerSession();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return ctx;
}

/** Require specific roles */
export async function requireRole(
  request: Request,
  roles: string[]
): Promise<AuthContext | NextResponse> {
  const ctx = await requireAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  if (!roles.includes(ctx.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return ctx;
}

/** Write an audit log entry */
export async function writeAuditLog(
  companyId: string,
  userId: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: { companyId, userId, action, entity, entityId, metadata },
  });
}
