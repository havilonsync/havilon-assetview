export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/auth/session";

export async function GET(request: NextRequest) {
  // Admins and auditors can read audit logs; auditors see only their company
  const ctx = await requireRole(request, ["admin", "auditor"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const entity = searchParams.get("entity");
  const entityId = searchParams.get("entityId");
  const userId = searchParams.get("userId");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        companyId: ctx.companyId,
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
        ...(userId ? { userId } : {}),
      },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({
      where: {
        companyId: ctx.companyId,
        ...(entity ? { entity } : {}),
        ...(entityId ? { entityId } : {}),
        ...(userId ? { userId } : {}),
      },
    }),
  ]);

  return NextResponse.json({ logs, total, limit, offset });
}
