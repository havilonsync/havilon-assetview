export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
import { createAutoReceipt } from "@/lib/receipts";
import { createSignedDownloadUrl, createSignedUploadUrl } from "@/lib/s3";
import { z } from "zod";
import crypto from "crypto";

const uploadRequestSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1), // MIME type
  fileSize: z.number().positive().max(50 * 1024 * 1024), // 50MB max
  documentType: z.enum(["deed", "lease", "insurance", "inspection", "legal", "correspondence", "financial"]),
  assetId: z.string().uuid().optional(),
  onboardingId: z.string().uuid().optional(),
  claimId: z.string().uuid().optional(),
  legalMatterId: z.string().uuid().optional(),
});

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
];

const finalizeUploadSchema = z.object({
  documentId: z.string().uuid(),
  hash: z.string().min(8).optional(),
});

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager", "owner", "auditor"]);
  if (ctx instanceof NextResponse) return ctx;

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "documentId required" }, { status: 422 });
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, companyId: ctx.companyId },
    select: { id: true, name: true, fileUrl: true, mimeType: true, fileSize: true, type: true, createdAt: true },
  });
  if (!document?.fileUrl) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    const signed = await createSignedDownloadUrl(document.fileUrl);
    return NextResponse.json({
      document,
      ...signed,
    });
  } catch (error) {
    console.error("[upload] signed download url generation failed", error);
    return NextResponse.json({ error: "S3 download signing unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = uploadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  if (!ALLOWED_MIME_TYPES.includes(parsed.data.fileType)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 422 });
  }

  // Generate a unique S3 key
  const fileId = crypto.randomUUID();
  const ext = parsed.data.fileName.split(".").pop() ?? "bin";
  const s3Key = `${ctx.companyId}/documents/${parsed.data.documentType}/${fileId}.${ext}`;

  let signedUpload;
  try {
    signedUpload = await createSignedUploadUrl({
      key: s3Key,
      contentType: parsed.data.fileType,
      contentLength: parsed.data.fileSize,
    });
  } catch (error) {
    console.error("[upload] signed upload url generation failed", error);
    return NextResponse.json({ error: "S3 upload signing unavailable" }, { status: 500 });
  }

  // Create document record (before upload completes — mark as pending)
  const document = await prisma.document.create({
    data: {
      companyId: ctx.companyId,
      name: parsed.data.fileName,
      type: parsed.data.documentType,
      fileUrl: signedUpload.fileUrl,
      fileSize: parsed.data.fileSize,
      mimeType: parsed.data.fileType,
      assetId: parsed.data.assetId,
      onboardingId: parsed.data.onboardingId,
      claimId: parsed.data.claimId,
      legalMatterId: parsed.data.legalMatterId,
      uploadedBy: ctx.userId,
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "upload_initiated", "Document", document.id, {
    fileName: parsed.data.fileName, documentType: parsed.data.documentType,
  });

  return NextResponse.json({
    documentId: document.id,
    uploadUrl: signedUpload.uploadUrl,
    fileUrl: signedUpload.fileUrl,
    expiresIn: signedUpload.expiresIn,
  });
}

// Called by client after upload completes to finalize and generate receipt
export async function PATCH(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const body = await request.json();
  const parsed = finalizeUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const document = await prisma.document.findFirst({
    where: { id: parsed.data.documentId, companyId: ctx.companyId },
  });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Store hash for chain of custody
  await prisma.document.update({ where: { id: parsed.data.documentId }, data: { hash: parsed.data.hash } });

  const receipt = await createAutoReceipt({
    companyId: ctx.companyId,
    type: "document",
    issuedTo: ctx.email,
    eventType: "Document upload",
    eventDescription: `${document.type} document uploaded: ${document.name}`,
    entityType: "Document",
    entityId: parsed.data.documentId,
    deliveredVia: "portal",
    hashSeed: parsed.data.hash ?? `${document.id}-${document.name}-${document.createdAt.toISOString()}`,
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "upload_complete", "Document", parsed.data.documentId, {
    fileName: document.name, hash: parsed.data.hash, receiptId: receipt.id,
  });

  return NextResponse.json({ document, receipt });
}
