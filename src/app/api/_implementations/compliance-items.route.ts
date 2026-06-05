import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";
import { sendComplianceAlert } from "@/lib/email";

const createItemSchema = z.object({
  title: z.string().min(1),
  propertyId: z.string().uuid().optional(),
  category: z.enum(["inspection","certificate","license","disclosure","registration","filing"]),
  dueDate: z.string(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

const updateItemSchema = z.object({
  status: z.enum(["upcoming","due_soon","overdue","complete"]).optional(),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
  completedAt: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // Auto-update statuses based on due dates
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 14 * 86400000);

  await prisma.complianceItem.updateMany({
    where: { companyId: ctx.companyId, status: "upcoming", dueDate: { lt: now } },
    data: { status: "overdue" },
  });
  await prisma.complianceItem.updateMany({
    where: { companyId: ctx.companyId, status: "upcoming", dueDate: { gte: now, lte: soonThreshold } },
    data: { status: "due_soon" },
  });

  const items = await prisma.complianceItem.findMany({
    where: { companyId: ctx.companyId, ...(status ? { status } : {}) },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const propertyIds = Array.from(new Set(items.map((i) => i.propertyId).filter((id): id is string => Boolean(id))));
  const properties = propertyIds.length
    ? await prisma.property.findMany({
        where: { companyId: ctx.companyId, id: { in: propertyIds } },
        select: { id: true, name: true, address: true },
      })
    : [];

  const propertyById = new Map(properties.map((p) => [p.id, p]));
  const itemsWithProperty = items.map((item) => ({
    ...item,
    property: item.propertyId ? propertyById.get(item.propertyId) ?? null : null,
  }));

  return NextResponse.json({ items: itemsWithProperty });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const body = await request.json();

  if (body.action === "complete") {
    const item = await prisma.complianceItem.findFirst({ where: { id: body.itemId, companyId: ctx.companyId } });
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const updated = await prisma.complianceItem.update({
      where: { id: body.itemId },
      data: { status: "complete", completedAt: new Date() },
    });
    await writeAuditLog(ctx.companyId, ctx.userId, "complete", "ComplianceItem", item.id, { title: item.title });
    return NextResponse.json(updated);
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const dueDate = new Date(parsed.data.dueDate);
  const now = new Date();
  const soonThreshold = new Date(now.getTime() + 14 * 86400000);
  const status = dueDate < now ? "overdue" : dueDate <= soonThreshold ? "due_soon" : "upcoming";

  const item = await prisma.complianceItem.create({
    data: { ...parsed.data, companyId: ctx.companyId, dueDate, status },
  });

  // Alert if already overdue or due soon
  if (status !== "upcoming") {
    const admins = await prisma.user.findMany({
      where: { companyId: ctx.companyId, role: { in: ["admin", "manager"] } },
      select: { email: true },
    });
    await sendComplianceAlert(
      admins.map((u) => u.email),
      item.title,
      item.propertyId ?? "General",
      parsed.data.dueDate
    );
  }

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "ComplianceItem", item.id, { title: item.title, dueDate: parsed.data.dueDate });
  return NextResponse.json(item, { status: 201 });
}
