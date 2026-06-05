export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createWOSchema = z.object({
  propertyId: z.string().uuid(),
  unitId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["emergency", "high", "normal", "low"]).default("normal"),
  category: z.enum(["hvac", "plumbing", "electrical", "structural", "general"]).optional(),
  vendorId: z.string().uuid().optional(),
  estimatedCost: z.number().positive().optional(),
  scheduledDate: z.string().datetime().optional(),
  reportedBy: z.string().optional(),
  notes: z.string().optional(),
});

function generateWONumber() {
  return `WO-${Date.now().toString().slice(-6)}`;
}

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "vendor"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const propertyId = searchParams.get("propertyId");

  // Vendors only see WOs assigned to them
  const vendorFilter = ctx.role === "vendor"
    ? { vendorId: ctx.userId }
    : {};

  const workOrders = await prisma.workOrder.findMany({
    where: {
      companyId: ctx.companyId,
      ...vendorFilter,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(propertyId ? { propertyId } : {}),
    },
    include: {
      property: { select: { name: true, address: true } },
      bids: { orderBy: { submittedAt: "desc" } },
    },
    orderBy: [
      { priority: "asc" }, // emergency first
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json({ workOrders });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createWOSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Verify property belongs to this company
  const property = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, companyId: ctx.companyId },
  });
  if (!property) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  // Fetch vendor name if provided
  let vendorName: string | undefined;
  if (parsed.data.vendorId) {
    const vendor = await prisma.vendor.findFirst({ where: { id: parsed.data.vendorId, companyId: ctx.companyId } });
    vendorName = vendor?.name;
  }

  const wo = await prisma.workOrder.create({
    data: {
      ...parsed.data,
      companyId: ctx.companyId,
      woNumber: generateWONumber(),
      status: "open",
      vendorName,
      scheduledDate: parsed.data.scheduledDate ? new Date(parsed.data.scheduledDate) : undefined,
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "WorkOrder", wo.id, {
    woNumber: wo.woNumber, priority: wo.priority, title: wo.title,
  });

  // If emergency, trigger notification (hook for email/SMS)
  if (wo.priority === "emergency") {
    // TODO: await sendEmergencyAlert(wo);
    console.log(`[ALERT] Emergency WO created: ${wo.woNumber} — ${wo.title}`);
  }

  return NextResponse.json(wo, { status: 201 });
}
