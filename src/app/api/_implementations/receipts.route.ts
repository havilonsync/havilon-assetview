export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAutoReceipt } from "@/lib/receipts";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createReceiptSchema = z.object({
  type: z.enum(["payment", "document", "lease", "claim", "disbursement", "action"]),
  issuedTo: z.string().min(1),
  eventType: z.string().min(1),
  eventDescription: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  amount: z.number().min(0).optional(),
  deliveredVia: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner", "auditor"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const limit = Number(searchParams.get("limit") ?? 50);

  const receipts = await prisma.receipt.findMany({
    where: {
      companyId: ctx.companyId,
      ...(type ? { type } : {}),
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
  });

  return NextResponse.json({ receipts });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createReceiptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const receipt = await createAutoReceipt({
    companyId: ctx.companyId,
    ...parsed.data,
    hashSeed: `${parsed.data.type}-${parsed.data.entityType ?? "generic"}-${parsed.data.entityId ?? parsed.data.issuedTo}`,
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "generate_receipt", "Receipt", receipt.id, parsed.data);

  return NextResponse.json({ receipt }, { status: 201 });
}