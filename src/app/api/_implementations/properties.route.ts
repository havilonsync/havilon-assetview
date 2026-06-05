import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createPropertySchema = z.object({
  assetId: z.string().uuid().optional(),
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  zip: z.string().min(5),
  type: z.enum(["residential", "commercial", "multi_family", "single_family"]),
  totalUnits: z.number().int().positive().default(1),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner"]);
  if (ctx instanceof NextResponse) return ctx;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const properties = await prisma.property.findMany({
    where: { companyId: ctx.companyId, ...(type ? { type } : {}) },
    include: {
      units: { include: { leases: { where: { status: "active" }, include: { tenant: true } } } },
      asset: { select: { assetCode: true, currentValue: true, ownerName: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ properties });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const body = await request.json();
  const parsed = createPropertySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const property = await prisma.property.create({ data: { ...parsed.data, companyId: ctx.companyId, status: "active" } });
  // Auto-create units
  if (parsed.data.totalUnits > 1) {
    await prisma.unit.createMany({
      data: Array.from({ length: parsed.data.totalUnits }, (_, i) => ({
        propertyId: property.id, unitNumber: String(i + 1), status: "vacant",
      })),
    });
  }
  await writeAuditLog(ctx.companyId, ctx.userId, "create", "Property", property.id, { name: property.name });
  return NextResponse.json(property, { status: 201 });
}
