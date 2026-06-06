export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, writeAuditLog } from "@/auth/session";
import { buildOtpAuthUrl, generateTotpSecret, verifyTotpToken } from "@/lib/totp";
import { z } from "zod";

const verifySchema = z.object({
  action: z.literal("verify"),
  token: z.string().regex(/^\d{6}$/),
});

const disableSchema = z.object({
  action: z.literal("disable"),
  token: z.string().regex(/^\d{6}$/),
});

export async function GET(request: NextRequest) {
  const ctx = await requireAuth(request);
  if (ctx instanceof NextResponse) return ctx;

  const user = await prisma.user.findFirst({
    where: { id: ctx.userId, companyId: ctx.companyId },
    select: { id: true, email: true, mfaEnabled: true, mfaSecret: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    mfaEnabled: user.mfaEnabled,
    hasPendingSetup: Boolean(user.mfaSecret) && !user.mfaEnabled,
  });
}

export async function POST(request: NextRequest) {
  const ctx = await requireAuth(request);
  if (ctx instanceof NextResponse) return ctx;

  const user = await prisma.user.findFirst({
    where: { id: ctx.userId, companyId: ctx.companyId },
    select: { id: true, email: true, mfaEnabled: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const issuer = process.env.TOTP_ISSUER ?? "Havilon AssetView";
  const secret = generateTotpSecret();
  const otpauthUrl = buildOtpAuthUrl({ issuer, accountName: user.email, secret });

  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabled: false },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "mfa_setup_started", "User", user.id, { issuer });

  return NextResponse.json({
    secret,
    manualEntryKey: secret,
    otpauthUrl,
    issuer,
    accountName: user.email,
    mfaEnabled: false,
  });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireAuth(request);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = body?.action === "disable"
    ? disableSchema.safeParse(body)
    : verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const user = await prisma.user.findFirst({
    where: { id: ctx.userId, companyId: ctx.companyId },
    select: { id: true, mfaEnabled: true, mfaSecret: true },
  });
  if (!user?.mfaSecret) {
    return NextResponse.json({ error: "MFA is not configured" }, { status: 409 });
  }

  if (!verifyTotpToken(user.mfaSecret, parsed.data.token)) {
    return NextResponse.json({ error: "Invalid TOTP code" }, { status: 401 });
  }

  if (parsed.data.action === "disable") {
    await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: false, mfaSecret: null } });
    await writeAuditLog(ctx.companyId, ctx.userId, "mfa_disabled", "User", user.id);
    return NextResponse.json({ mfaEnabled: false });
  }

  await prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
  await writeAuditLog(ctx.companyId, ctx.userId, "mfa_enabled", "User", user.id);
  return NextResponse.json({ mfaEnabled: true });
}