export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const createOnboardingSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional(),
  totalSteps: z.number().int().positive().max(20).optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner"]);
  if (ctx instanceof NextResponse) return ctx;

  const onboardings = await prisma.onboarding.findMany({
    where: { companyId: ctx.companyId },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
      documents: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
  });

  return NextResponse.json({ onboardings });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const totalSteps = parsed.data.totalSteps ?? 7;
  const onboarding = await prisma.onboarding.create({
    data: {
      companyId: ctx.companyId,
      clientName: parsed.data.clientName,
      clientEmail: parsed.data.clientEmail,
      currentStep: 1,
      totalSteps,
      status: "in_progress",
      steps: {
        create: Array.from({ length: totalSteps }, (_, index) => ({
          stepNumber: index + 1,
          name: `Step ${index + 1}`,
          status: index === 0 ? "in_progress" : "pending",
        })),
      },
    },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "Onboarding", onboarding.id, {
    clientName: onboarding.clientName,
    totalSteps,
  });

  return NextResponse.json({ onboarding }, { status: 201 });
}