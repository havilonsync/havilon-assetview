import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createClaimSchema = z.object({
  policyId: z.string().uuid(),
  incidentDate: z.string(),
  description: z.string().min(1),
  claimAmount: z.number().min(0).optional(),
  adjusterName: z.string().optional(),
  adjusterEmail: z.string().email().optional(),
  notes: z.string().optional(),
});

const updateClaimSchema = z.object({
  status: z.enum(["filed","under_review","documentation_needed","approved","denied","litigation_hold"]).optional(),
  approvedAmount: z.number().min(0).optional(),
  adjusterName: z.string().optional(),
  paidDate: z.string().optional(),
  notes: z.string().optional(),
});

function generateClaimNumber() {
  return `CLM-${String(Math.floor(Math.random() * 9000 + 1000)).padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const claims = await prisma.insuranceClaim.findMany({
    where: {
      policy: { companyId: ctx.companyId },
      ...(status ? { status } : {}),
    },
    include: { policy: { select: { carrier: true, policyNumber: true } }, documents: true },
    orderBy: { filedDate: "desc" },
  });
  return NextResponse.json({ claims });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const body = await request.json();
  const parsed = createClaimSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  // Verify policy belongs to this company
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: parsed.data.policyId, companyId: ctx.companyId },
  });
  if (!policy) return NextResponse.json({ error: "Policy not found" }, { status: 404 });

  const claim = await prisma.insuranceClaim.create({
    data: {
      policyId: parsed.data.policyId,
      claimNumber: generateClaimNumber(),
      incidentDate: new Date(parsed.data.incidentDate),
      filedDate: new Date(),
      description: parsed.data.description,
      claimAmount: parsed.data.claimAmount,
      adjusterName: parsed.data.adjusterName,
      adjusterEmail: parsed.data.adjusterEmail,
      status: "filed",
      notes: parsed.data.notes,
    },
  });

  // Auto-generate receipt
  await prisma.receipt.create({
    data: {
      companyId: ctx.companyId,
      receiptNumber: `R-${Date.now().toString(36).toUpperCase()}`,
      type: "claim",
      issuedTo: policy.carrier,
      eventType: "Insurance claim submitted",
      eventDescription: `${claim.claimNumber} — ${parsed.data.description}`,
      entityType: "InsuranceClaim",
      entityId: claim.id,
      amount: parsed.data.claimAmount,
      hash: Buffer.from(`${claim.id}-${Date.now()}`).toString("base64").slice(0, 16),
      isImmutable: true,
      deliveredVia: "portal",
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "InsuranceClaim", claim.id, {
    claimNumber: claim.claimNumber, policyId: parsed.data.policyId,
  });
  return NextResponse.json(claim, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const body = await request.json();
  const { claimId, ...updates } = body;
  if (!claimId) return NextResponse.json({ error: "claimId required" }, { status: 422 });

  const parsed = updateClaimSchema.safeParse(updates);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const existing = await prisma.insuranceClaim.findFirst({
    where: { id: claimId, policy: { companyId: ctx.companyId } },
  });
  if (!existing) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

  const claim = await prisma.insuranceClaim.update({
    where: { id: claimId },
    data: {
      ...parsed.data,
      ...(parsed.data.paidDate ? { paidDate: new Date(parsed.data.paidDate) } : {}),
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "update", "InsuranceClaim", claimId, parsed.data);
  return NextResponse.json(claim);
}
