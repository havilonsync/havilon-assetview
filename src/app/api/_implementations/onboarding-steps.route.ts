export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createStepSchema = z.object({
  onboardingId: z.string().uuid(),
  stepNumber: z.number().int().positive(),
  name: z.string().min(1),
  status: z.enum(["pending", "in_progress", "complete"]).optional(),
  notes: z.string().optional(),
});

const updateStepSchema = z.object({
  stepId: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "complete"]).optional(),
  notes: z.string().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

async function syncOnboardingProgress(onboardingId: string) {
  const steps = await prisma.onboardingStep.findMany({
    where: { onboardingId },
    orderBy: { stepNumber: "asc" },
  });

  const totalSteps = steps.reduce((max, step) => Math.max(max, step.stepNumber), 0);
  const nextIncomplete = steps.find((step) => step.status !== "complete");
  const allComplete = steps.length > 0 && steps.every((step) => step.status === "complete");

  return prisma.onboarding.update({
    where: { id: onboardingId },
    data: {
      currentStep: (nextIncomplete?.stepNumber ?? totalSteps) || 1,
      totalSteps: Math.max(totalSteps, 1),
      status: allComplete ? "complete" : "in_progress",
      completedAt: allComplete ? new Date() : null,
    },
    select: { id: true, currentStep: true, totalSteps: true, status: true, completedAt: true },
  });
}

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const onboardingId = searchParams.get("onboardingId");
  const status = searchParams.get("status");

  const steps = await prisma.onboardingStep.findMany({
    where: {
      onboarding: { companyId: ctx.companyId },
      ...(onboardingId ? { onboardingId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      onboarding: {
        select: { id: true, clientName: true, clientEmail: true, currentStep: true, totalSteps: true, status: true },
      },
    },
    orderBy: [{ onboardingId: "asc" }, { stepNumber: "asc" }],
  });

  return NextResponse.json({ steps });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createStepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const onboarding = await prisma.onboarding.findFirst({
    where: { id: parsed.data.onboardingId, companyId: ctx.companyId },
    select: { id: true, currentStep: true },
  });
  if (!onboarding) {
    return NextResponse.json({ error: "Onboarding record not found" }, { status: 404 });
  }

  const existing = await prisma.onboardingStep.findFirst({
    where: { onboardingId: parsed.data.onboardingId, stepNumber: parsed.data.stepNumber },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Step number already exists for this onboarding record" }, { status: 409 });
  }

  const step = await prisma.onboardingStep.create({
    data: {
      onboardingId: parsed.data.onboardingId,
      stepNumber: parsed.data.stepNumber,
      name: parsed.data.name,
      status: parsed.data.status ?? "pending",
      notes: parsed.data.notes,
      completedAt: parsed.data.status === "complete" ? new Date() : undefined,
    },
  });

  const progress = await syncOnboardingProgress(parsed.data.onboardingId);
  await writeAuditLog(ctx.companyId, ctx.userId, "create", "OnboardingStep", step.id, {
    onboardingId: parsed.data.onboardingId,
    stepNumber: parsed.data.stepNumber,
    name: parsed.data.name,
  });

  return NextResponse.json({ step, onboarding: progress }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = updateStepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const existing = await prisma.onboardingStep.findFirst({
    where: { id: parsed.data.stepId, onboarding: { companyId: ctx.companyId } },
    select: { id: true, onboardingId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  const step = await prisma.onboardingStep.update({
    where: { id: parsed.data.stepId },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.completedAt !== undefined
        ? { completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : null }
        : parsed.data.status === "complete"
          ? { completedAt: new Date() }
          : {}),
    },
  });

  const progress = await syncOnboardingProgress(existing.onboardingId);
  await writeAuditLog(ctx.companyId, ctx.userId, "update", "OnboardingStep", step.id, parsed.data);

  return NextResponse.json({ step, onboarding: progress });
}