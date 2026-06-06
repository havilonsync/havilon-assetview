export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createPolicySchema = z.object({
  assetId: z.string().uuid().optional(),
  carrier: z.string().min(1),
  policyNumber: z.string().min(1),
  type: z.enum(["property", "liability", "umbrella"]),
  coverageAmount: z.number().min(0).optional(),
  premium: z.number().min(0).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(["active", "expired", "cancelled", "pending"]).optional(),
  notes: z.string().optional(),
});

const updatePolicySchema = z.object({
  policyId: z.string().uuid(),
  assetId: z.string().uuid().nullable().optional(),
  carrier: z.string().min(1).optional(),
  policyNumber: z.string().min(1).optional(),
  type: z.enum(["property", "liability", "umbrella"]).optional(),
  coverageAmount: z.number().min(0).nullable().optional(),
  premium: z.number().min(0).nullable().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["active", "expired", "cancelled", "pending"]).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner", "auditor"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const expiringSoon = searchParams.get("expiringSoon") === "true";

  const policies = await prisma.insurancePolicy.findMany({
    where: {
      companyId: ctx.companyId,
      ...(status ? { status } : {}),
      ...(expiringSoon
        ? { endDate: { gte: new Date(), lte: new Date(Date.now() + 45 * 86400000) } }
        : {}),
    },
    include: {
      asset: { select: { id: true, name: true, assetCode: true, type: true, status: true } },
      claims: { select: { id: true, claimNumber: true, status: true, filedDate: true, claimAmount: true }, orderBy: { filedDate: "desc" }, take: 5 },
    },
    orderBy: { endDate: "asc" },
  });

  return NextResponse.json({ policies });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  if (parsed.data.assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: parsed.data.assetId, companyId: ctx.companyId }, select: { id: true, name: true } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
  }

  const policy = await prisma.insurancePolicy.create({
    data: {
      companyId: ctx.companyId,
      assetId: parsed.data.assetId,
      carrier: parsed.data.carrier,
      policyNumber: parsed.data.policyNumber,
      type: parsed.data.type,
      coverageAmount: parsed.data.coverageAmount,
      premium: parsed.data.premium,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      status: parsed.data.status ?? "active",
      notes: parsed.data.notes,
    },
    include: { asset: { select: { id: true, name: true, assetCode: true, type: true, status: true } } },
  });

  if (policy.assetId) {
    await prisma.lifecycleEvent.create({
      data: {
        assetId: policy.assetId,
        eventType: "insurance",
        title: `Insurance policy added: ${policy.policyNumber}`,
        description: `${policy.carrier} ${policy.type} policy`,
        amount: policy.premium,
        occurredAt: new Date(policy.startDate),
        recordedBy: ctx.userId,
      },
    });
  }

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "InsurancePolicy", policy.id, {
    policyNumber: policy.policyNumber,
    carrier: policy.carrier,
    assetId: policy.assetId,
  });

  return NextResponse.json({ policy }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = updatePolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.insurancePolicy.findFirst({
    where: { id: parsed.data.policyId, companyId: ctx.companyId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  if (parsed.data.assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: parsed.data.assetId, companyId: ctx.companyId }, select: { id: true } });
    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
  }

  const policy = await prisma.insurancePolicy.update({
    where: { id: parsed.data.policyId },
    data: {
      ...(parsed.data.assetId !== undefined ? { assetId: parsed.data.assetId } : {}),
      ...(parsed.data.carrier !== undefined ? { carrier: parsed.data.carrier } : {}),
      ...(parsed.data.policyNumber !== undefined ? { policyNumber: parsed.data.policyNumber } : {}),
      ...(parsed.data.type !== undefined ? { type: parsed.data.type } : {}),
      ...(parsed.data.coverageAmount !== undefined ? { coverageAmount: parsed.data.coverageAmount } : {}),
      ...(parsed.data.premium !== undefined ? { premium: parsed.data.premium } : {}),
      ...(parsed.data.startDate ? { startDate: new Date(parsed.data.startDate) } : {}),
      ...(parsed.data.endDate ? { endDate: new Date(parsed.data.endDate) } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    },
    include: { asset: { select: { id: true, name: true, assetCode: true, type: true, status: true } } },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "update", "InsurancePolicy", policy.id, parsed.data);
  return NextResponse.json({ policy });
}