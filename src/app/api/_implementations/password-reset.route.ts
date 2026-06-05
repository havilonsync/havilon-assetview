import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// In production: store reset tokens in DB with expiry
// This implementation sends the token via email
const resetTokens = new Map<string, { email: string; companyId: string; expiresAt: Date }>();

const requestSchema = z.object({
  email: z.string().email(),
});

const confirmSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Step 1: Request reset
  if (body.action === "request") {
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 422 });

    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email },
      include: { company: { select: { status: true } } },
    });

    // Always return success to prevent email enumeration
    if (!user || user.company.status !== "active") {
      return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, {
      email: user.email,
      companyId: user.companyId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
    });

    // In production: await sendPasswordResetEmail(user.email, token);
    console.log(`[Password Reset] Token for ${user.email}: ${token}`);

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "password_reset_requested",
        entity: "User",
        entityId: user.id,
      },
    });

    return NextResponse.json({ message: "If that email exists, a reset link has been sent." });
  }

  // Step 2: Confirm reset with token + new password
  if (body.action === "confirm") {
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });

    const tokenData = resetTokens.get(parsed.data.token);
    if (!tokenData || tokenData.expiresAt < new Date()) {
      resetTokens.delete(parsed.data.token);
      return NextResponse.json({ error: "Token invalid or expired" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { email: tokenData.email } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    resetTokens.delete(parsed.data.token);

    await prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: "password_reset_completed",
        entity: "User",
        entityId: user.id,
      },
    });

    return NextResponse.json({ message: "Password updated successfully." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
