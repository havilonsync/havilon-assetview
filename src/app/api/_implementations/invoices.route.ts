export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { z } from "zod";

const lineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
});

const createInvoiceSchema = z.object({
  toName: z.string().min(1),
  toEmail: z.string().email().optional(),
  description: z.string().min(1),
  lineItems: z.array(lineItemSchema).optional(),
  dueDate: z.string().datetime(),
  notes: z.string().optional(),
});

function generateInvoiceNumber() {
  return `INV-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // Auto-mark overdue invoices
  await prisma.invoice.updateMany({
    where: {
      companyId: ctx.companyId,
      status: "pending",
      dueDate: { lt: new Date() },
    },
    data: { status: "overdue" },
  });

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId: ctx.companyId,
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  const summary = {
    total: invoices.reduce((s, i) => s + Number(i.total), 0),
    collected: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.total), 0),
    outstanding: invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.total), 0),
    overdue: invoices.filter((i) => i.status === "overdue").reduce((s, i) => s + Number(i.total), 0),
  };

  return NextResponse.json({ invoices, summary });
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // Calculate totals from line items or use description as single line
  const lineItems = parsed.data.lineItems ?? [];
  const subtotal = lineItems.length > 0
    ? lineItems.reduce((s, item) => s + item.quantity * item.unitPrice, 0)
    : body.subtotal ?? 0;

  const invoice = await prisma.invoice.create({
    data: {
      companyId: ctx.companyId,
      invoiceNumber: generateInvoiceNumber(),
      toName: parsed.data.toName,
      toEmail: parsed.data.toEmail,
      description: parsed.data.description,
      lineItems: lineItems.length > 0 ? lineItems : undefined,
      subtotal,
      taxAmount: 0,
      total: subtotal,
      dueDate: new Date(parsed.data.dueDate),
      status: "pending",
      notes: parsed.data.notes,
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "create", "Invoice", invoice.id, {
    invoiceNumber: invoice.invoiceNumber, total: invoice.total, toName: invoice.toName,
  });

  // TODO: send invoice email via Resend/SendGrid
  // await sendInvoiceEmail(invoice);

  return NextResponse.json(invoice, { status: 201 });
}
