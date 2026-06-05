export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const disbursementSchema = z.object({
  trustAccountId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().min(1),
  referenceId: z.string().optional(),
});

function generateReceiptHash(data: string): string {
  // In production: use crypto.createHash('sha256').update(data).digest('hex')
  return Buffer.from(data).toString("base64").slice(0, 16);
}

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner"]);
  if (ctx instanceof NextResponse) return ctx;

  const ownerFilter = ctx.role === "owner" ? { ownerId: ctx.userId } : {};

  const accounts = await prisma.trustAccount.findMany({
    where: { companyId: ctx.companyId, ...ownerFilter },
    include: {
      transactions: { orderBy: { occurredAt: "desc" }, take: 10 },
      statements: { orderBy: { generatedAt: "desc" }, take: 3 },
    },
    orderBy: { ownerName: "asc" },
  });

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);
  const totalReserve = accounts.reduce((s, a) => s + Number(a.reserveBalance), 0);
  return NextResponse.json({ accounts, totalBalance, totalReserve });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = disbursementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const account = await prisma.trustAccount.findFirst({
    where: { id: parsed.data.trustAccountId, companyId: ctx.companyId },
  });
  if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (Number(account.balance) < parsed.data.amount) {
    return NextResponse.json({ error: "Insufficient trust balance" }, { status: 422 });
  }

  const [updatedAccount, transaction, receipt] = await prisma.$transaction(async (tx) => {
    const updAcc = await tx.trustAccount.update({
      where: { id: account.id },
      data: { balance: { decrement: parsed.data.amount } },
    });
    const txn = await tx.trustTransaction.create({
      data: {
        trustAccountId: account.id,
        type: "disbursement",
        amount: parsed.data.amount,
        description: parsed.data.description,
        referenceId: parsed.data.referenceId,
        createdBy: ctx.userId,
      },
    });
    const hash = generateReceiptHash(`${account.id}-${txn.id}-${Date.now()}`);
    const rec = await tx.receipt.create({
      data: {
        companyId: ctx.companyId,
        receiptNumber: `R-${Date.now().toString(36).toUpperCase()}`,
        type: "disbursement",
        issuedTo: account.ownerName,
        eventType: "Trust disbursement",
        eventDescription: parsed.data.description,
        entityType: "TrustTransaction",
        entityId: txn.id,
        amount: parsed.data.amount,
        hash,
        isImmutable: true,
        deliveredVia: "email + portal",
      },
    });
    return [updAcc, txn, rec];
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "disbursement", "TrustAccount", account.id, {
    amount: parsed.data.amount, ownerName: account.ownerName, receiptId: receipt.id,
  });

  return NextResponse.json({ account: updatedAccount, transaction, receipt }, { status: 201 });
}
