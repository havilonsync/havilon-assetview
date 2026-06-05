export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  stage: z.enum(["new", "proposal", "negotiation", "onboarding", "closed_won", "closed_lost"]).default("new"),
  source: z.string().optional(),
  pipelineValue: z.number().optional(),
  propertyCount: z.number().int().default(0),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const stage = searchParams.get("stage");
  const search = searchParams.get("q");

  const leads = await prisma.lead.findMany({
    where: {
      companyId: ctx.companyId,
      ...(stage ? { stage } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
    include: {
      proposals: { orderBy: { createdAt: "desc" }, take: 1 },
      activities: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const counts = await prisma.lead.groupBy({
    by: ["stage"],
    where: { companyId: ctx.companyId },
    _count: { id: true },
  });

  return NextResponse.json({ leads, stageCounts: counts });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const lead = await prisma.lead.create({
    data: {
      ...parsed.data,
      companyId: ctx.companyId,
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "Lead", lead.id, { name: lead.name, stage: lead.stage });

  return NextResponse.json(lead, { status: 201 });
}
