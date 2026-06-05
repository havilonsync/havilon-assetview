import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createLeaseSchema = z.object({
  unitId: z.string().uuid(),
  tenantFirstName: z.string().min(1),
  tenantLastName: z.string().min(1),
  tenantEmail: z.string().email().optional(),
  tenantPhone: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  monthlyRent: z.number().positive(),
  depositAmount: z.number().min(0),
});

const renewLeaseSchema = z.object({
  leaseId: z.string().uuid(),
  newEndDate: z.string(),
  newMonthlyRent: z.number().positive(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner"]);
  if (ctx instanceof NextResponse) return ctx;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const expiringSoon = searchParams.get("expiringSoon");

  const leases = await prisma.lease.findMany({
    where: {
      unit: { property: { companyId: ctx.companyId } },
      ...(status ? { status } : {}),
      ...(expiringSoon === "true" ? {
        status: "active",
        endDate: { gte: new Date(), lte: new Date(Date.now() + 60 * 86400000) },
      } : {}),
    },
    include: {
      tenant: true,
      unit: { include: { property: { select: { name: true, address: true } } } },
      payments: { orderBy: { dueDate: "desc" }, take: 3 },
    },
    orderBy: { endDate: "asc" },
  });
  return NextResponse.json({ leases });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const body = await request.json();

  // Renew existing lease
  if (body.action === "renew") {
    const parsed = renewLeaseSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

    const existing = await prisma.lease.findFirst({
      where: { id: parsed.data.leaseId, unit: { property: { companyId: ctx.companyId } } },
      include: { tenant: true, unit: { include: { property: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Lease not found" }, { status: 404 });

    await prisma.lease.update({ where: { id: existing.id }, data: { status: "expired" } });

    const renewed = await prisma.lease.create({
      data: {
        unitId: existing.unitId,
        tenantId: existing.tenantId,
        startDate: existing.endDate,
        endDate: new Date(parsed.data.newEndDate),
        monthlyRent: parsed.data.newMonthlyRent,
        depositAmount: existing.depositAmount ?? 0,
        depositHeld: existing.depositHeld ?? 0,
        status: "active",
        renewalSent: false,
        signedAt: new Date(),
      },
    });

    // Auto-generate receipt
    await prisma.receipt.create({
      data: {
        companyId: ctx.companyId,
        receiptNumber: `R-${Date.now().toString(36).toUpperCase()}`,
        type: "lease",
        issuedTo: `${existing.tenant.firstName} ${existing.tenant.lastName}`,
        eventType: "Lease renewal executed",
        eventDescription: `Renewed — ${existing.unit.property.name} Unit ${existing.unit.unitNumber}`,
        entityType: "Lease",
        entityId: renewed.id,
        hash: Buffer.from(`${renewed.id}-${Date.now()}`).toString("base64").slice(0, 16),
        isImmutable: true,
        deliveredVia: "email + portal",
      },
    });

    await writeAuditLog(ctx.companyId, ctx.userId, "renew", "Lease", renewed.id, {
      newEndDate: parsed.data.newEndDate, newRent: parsed.data.newMonthlyRent,
    });
    return NextResponse.json(renewed, { status: 201 });
  }

  // Create new lease
  const parsed = createLeaseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const tenant = await prisma.tenant.create({
    data: {
      companyId: ctx.companyId,
      firstName: parsed.data.tenantFirstName,
      lastName: parsed.data.tenantLastName,
      email: parsed.data.tenantEmail,
      phone: parsed.data.tenantPhone,
    },
  });

  const lease = await prisma.lease.create({
    data: {
      unitId: parsed.data.unitId,
      tenantId: tenant.id,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      monthlyRent: parsed.data.monthlyRent,
      depositAmount: parsed.data.depositAmount,
      depositHeld: parsed.data.depositAmount,
      status: "active",
      signedAt: new Date(),
    },
  });

  await prisma.unit.update({ where: { id: parsed.data.unitId }, data: { status: "occupied" } });
  await writeAuditLog(ctx.companyId, ctx.userId, "create", "Lease", lease.id, {
    tenantId: tenant.id, monthlyRent: lease.monthlyRent,
  });
  return NextResponse.json({ lease, tenant }, { status: 201 });
}
