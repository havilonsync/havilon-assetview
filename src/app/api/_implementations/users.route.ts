export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendWelcomeEmail } from "@/lib/email";

const inviteUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "owner", "auditor", "vendor", "tenant"]),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "manager", "owner", "auditor", "vendor", "tenant"]).optional(),
  mfaEnabled: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin"]);
  if (ctx instanceof NextResponse) return ctx;

  const users = await prisma.user.findMany({
    where: { companyId: ctx.companyId },
    select: {
      id: true, name: true, email: true, role: true,
      mfaEnabled: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = inviteUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Check for duplicate email within company
  const existing = await prisma.user.findFirst({
    where: { companyId: ctx.companyId, email: parsed.data.email },
  });
  if (existing) return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });

  // Generate temporary password
  const tempPassword = crypto.randomBytes(8).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      companyId: ctx.companyId,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      passwordHash,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  // Send welcome email with temp password
  const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true } });
  await sendWelcomeEmail(user.email, user.name, company?.name ?? "your company", tempPassword);

  await writeAuditLog(ctx.companyId, ctx.userId, "invite_user", "User", user.id, {
    email: user.email, role: user.role,
  });

  return NextResponse.json({ user }, { status: 201 });
}
