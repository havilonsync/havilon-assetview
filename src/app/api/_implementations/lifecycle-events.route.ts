export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { createAutoReceipt } from "@/lib/receipts";
import { z } from "zod";

const createLifecycleEventSchema = z.object({
  assetId: z.string().uuid(),
  eventType: z.enum(["acquisition", "lease", "maintenance", "inspection", "insurance", "legal", "disposal"]),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  occurredAt: z.string().datetime().optional(),
});

const updateLifecycleEventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().min(0).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
  receiptId: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner", "auditor"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  const eventType = searchParams.get("eventType");

  const events = await prisma.lifecycleEvent.findMany({
    where: {
      asset: { companyId: ctx.companyId },
      ...(assetId ? { assetId } : {}),
      ...(eventType ? { eventType } : {}),
    },
    include: {
      asset: { select: { id: true, name: true, assetCode: true, type: true, status: true } },
    },
    orderBy: { occurredAt: "desc" },
  });

  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createLifecycleEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const asset = await prisma.asset.findFirst({
    where: { id: parsed.data.assetId, companyId: ctx.companyId },
    select: { id: true, name: true, assetCode: true },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const event = await prisma.lifecycleEvent.create({
    data: {
      assetId: parsed.data.assetId,
      eventType: parsed.data.eventType,
      title: parsed.data.title,
      description: parsed.data.description,
      amount: parsed.data.amount,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      recordedBy: ctx.userId,
    },
  });

  if (parsed.data.eventType === "disposal") {
    await prisma.asset.update({ where: { id: parsed.data.assetId }, data: { status: "disposed" } });
  }

  const receipt = await createAutoReceipt({
    companyId: ctx.companyId,
    type: "action",
    issuedTo: ctx.email,
    eventType: `Asset lifecycle ${parsed.data.eventType}`,
    eventDescription: `${asset.assetCode} — ${parsed.data.title}`,
    entityType: "LifecycleEvent",
    entityId: event.id,
    amount: parsed.data.amount,
    deliveredVia: "portal",
    hashSeed: `${asset.id}-${parsed.data.eventType}-${event.id}`,
  });

  const updated = await prisma.lifecycleEvent.update({
    where: { id: event.id },
    data: { receiptId: receipt.id },
    include: { asset: { select: { id: true, name: true, assetCode: true, type: true, status: true } } },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "LifecycleEvent", event.id, {
    assetId: parsed.data.assetId,
    eventType: parsed.data.eventType,
    receiptId: receipt.id,
  });

  return NextResponse.json({ event: updated, receipt }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = updateLifecycleEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.lifecycleEvent.findFirst({
    where: { id: parsed.data.eventId, asset: { companyId: ctx.companyId } },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lifecycle event not found" }, { status: 404 });
  }

  const event = await prisma.lifecycleEvent.update({
    where: { id: parsed.data.eventId },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
      ...(parsed.data.occurredAt ? { occurredAt: new Date(parsed.data.occurredAt) } : {}),
      ...(parsed.data.receiptId !== undefined ? { receiptId: parsed.data.receiptId } : {}),
    },
    include: { asset: { select: { id: true, name: true, assetCode: true, type: true, status: true } } },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "update", "LifecycleEvent", event.id, parsed.data);
  return NextResponse.json({ event });
}