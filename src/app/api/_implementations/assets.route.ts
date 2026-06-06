export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createAssetSchema = z.object({
  assetCode: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["residential", "commercial", "multi_family", "single_family"]),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  acquiredAt: z.string().datetime().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  ownerName: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner", "auditor"]);
  if (ctx instanceof NextResponse) return ctx;

  const assets = await prisma.asset.findMany({
    where: { companyId: ctx.companyId },
    include: {
      properties: { select: { id: true, totalUnits: true, status: true } },
      lifecycleEvents: { orderBy: { occurredAt: "desc" }, take: 5 },
      insurancePolicies: { select: { id: true, policyNumber: true, carrier: true, status: true, endDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createAssetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.asset.findFirst({ where: { assetCode: parsed.data.assetCode } });
  if (existing) {
    return NextResponse.json({ error: "Asset code already exists" }, { status: 409 });
  }

  const asset = await prisma.asset.create({
    data: {
      companyId: ctx.companyId,
      assetCode: parsed.data.assetCode,
      name: parsed.data.name,
      type: parsed.data.type,
      address: parsed.data.address,
      city: parsed.data.city,
      state: parsed.data.state,
      zip: parsed.data.zip,
      acquiredAt: parsed.data.acquiredAt ? new Date(parsed.data.acquiredAt) : undefined,
      purchasePrice: parsed.data.purchasePrice,
      currentValue: parsed.data.currentValue,
      ownerName: parsed.data.ownerName,
      notes: parsed.data.notes,
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "Asset", asset.id, {
    assetCode: asset.assetCode,
    name: asset.name,
  });

  return NextResponse.json({ asset }, { status: 201 });
}