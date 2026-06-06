import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";

type ReceiptInput = {
  companyId: string;
  type: string;
  issuedTo: string;
  eventType: string;
  eventDescription: string;
  entityType?: string;
  entityId?: string;
  amount?: number | string | null;
  deliveredVia?: string;
  hashSeed?: string;
};

export function generateReceiptNumber() {
  return `R-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

export function generateReceiptHash(seed: string) {
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24);
}

export async function createAutoReceipt(input: ReceiptInput) {
  return prisma.receipt.create({
    data: {
      companyId: input.companyId,
      receiptNumber: generateReceiptNumber(),
      type: input.type,
      issuedTo: input.issuedTo,
      eventType: input.eventType,
      eventDescription: input.eventDescription,
      entityType: input.entityType,
      entityId: input.entityId,
      amount: input.amount ?? undefined,
      hash: generateReceiptHash(input.hashSeed ?? `${input.companyId}-${input.type}-${input.entityType ?? "unknown"}-${input.entityId ?? crypto.randomUUID()}`),
      isImmutable: true,
      deliveredVia: input.deliveredVia ?? "portal",
    },
  });
}