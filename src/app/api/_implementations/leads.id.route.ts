export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  stage: z.enum(["new","proposal","negotiation","onboarding","closed_won","closed_lost"]).optional(),
  source: z.string().optional(),
  pipelineValue: z.number().optional(),
  propertyCount: z.number().int().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireRole(request, ["admin","manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const lead = await prisma.lead.findFirst({
    where: { id, companyId: ctx.companyId },
    include: { proposals: { orderBy: { createdAt: "desc" } }, activities: { orderBy: { createdAt: "desc" } } },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireRole(request, ["admin","manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { id, companyId: ctx.companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();
  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const lead = await prisma.lead.update({ where: { id }, data: { ...parsed.data, updatedAt: new Date() } });
  await writeAuditLog(ctx.companyId, ctx.userId, "update", "Lead", lead.id, parsed.data);
  return NextResponse.json(lead);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const ctx = await requireRole(request, ["admin"]);
  if (ctx instanceof NextResponse) return ctx;
  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { id, companyId: ctx.companyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.lead.delete({ where: { id } });
  await writeAuditLog(ctx.companyId, ctx.userId, "delete", "Lead", id);
  return new NextResponse(null, { status: 204 });
}
