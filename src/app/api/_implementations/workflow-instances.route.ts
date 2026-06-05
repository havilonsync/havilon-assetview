import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createInstanceSchema = z.object({
  templateId: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string(),
  entityLabel: z.string(),
});

const advanceStepSchema = z.object({
  instanceId: z.string().uuid(),
  note: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "active";

  const instances = await prisma.workflowInstance.findMany({
    where: { template: { companyId: ctx.companyId }, status },
    include: { template: { select: { name: true, steps: true } } },
    orderBy: { startedAt: "desc" },
  });
  return NextResponse.json({ instances });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const body = await request.json();

  // Advance a workflow step
  if (body.action === "advance") {
    const parsed = advanceStepSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

    const instance = await prisma.workflowInstance.findFirst({
      where: { id: parsed.data.instanceId, template: { companyId: ctx.companyId } },
      include: { template: true },
    });
    if (!instance) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const steps = instance.template.steps as any[];
    const newStep = instance.currentStep + 1;
    const isComplete = newStep > steps.length;

    const updated = await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: {
        currentStep: isComplete ? instance.currentStep : newStep,
        status: isComplete ? "complete" : "active",
        completedAt: isComplete ? new Date() : undefined,
        stepHistory: [
          ...((instance.stepHistory as any[]) ?? []),
          { step: instance.currentStep, completedAt: new Date(), note: parsed.data.note, completedBy: ctx.userId },
        ],
      },
    });

    await writeAuditLog(ctx.companyId, ctx.userId, "advance_step", "WorkflowInstance", instance.id, {
      step: instance.currentStep, isComplete,
    });
    return NextResponse.json(updated);
  }

  // Create new workflow instance
  const parsed = createInstanceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const template = await prisma.workflowTemplate.findFirst({
    where: { id: parsed.data.templateId, companyId: ctx.companyId, active: true },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const instance = await prisma.workflowInstance.create({
    data: {
      templateId: template.id,
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      currentStep: 1,
      status: "active",
      stepHistory: [],
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "WorkflowInstance", instance.id, {
    templateName: template.name, entityType: parsed.data.entityType,
  });
  return NextResponse.json(instance, { status: 201 });
}
