export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole, writeAuditLog } from "@/auth/session";
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

  // In production: generate a real pre-signed S3 URL
  // const s3 = new S3Client({ region: process.env.AWS_REGION });
  // const cmd = new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: s3Key, ContentType: parsed.data.fileType });
  // const signedUrl = await getSignedUrl(s3, cmd, { expiresIn: 300 });

  const signedUrl = `https://your-bucket.s3.amazonaws.com/${s3Key}?X-Amz-Signature=PLACEHOLDER`;
  const fileUrl = `https://your-bucket.s3.amazonaws.com/${s3Key}`;

  // Create document record (before upload completes — mark as pending)
  const document = await prisma.document.create({
    data: {
      companyId: ctx.companyId,
      name: parsed.data.fileName,
      type: parsed.data.documentType,
      fileUrl,
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
    uploadUrl: signedUrl,   // Client PUTs file directly to this URL
    fileUrl,                // Permanent URL after upload
    expiresIn: 300,         // seconds
  });
}

// Called by client after upload completes to finalize and generate receipt
export async function PATCH(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  const { documentId, hash } = await request.json();

  const document = await prisma.document.findFirst({
    where: { id: documentId, companyId: ctx.companyId },
  });
  if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Store hash for chain of custody
  await prisma.document.update({ where: { id: documentId }, data: { hash } });

  // Auto-generate receipt
  const receipt = await prisma.receipt.create({
    data: {
      companyId: ctx.companyId,
      receiptNumber: `R-${Date.now().toString(36).toUpperCase()}`,
      type: "document",
      issuedTo: ctx.email,
      eventType: "Document upload",
      eventDescription: `${document.type} document uploaded: ${document.name}`,
      entityType: "Document",
      entityId: documentId,
      hash: hash ?? crypto.randomUUID(),
      isImmutable: true,
      deliveredVia: "portal",
    },
  });

  await writeAuditLog(ctx.companyId, ctx.userId, "upload_complete", "Document", documentId, {
    fileName: document.name, hash, receiptId: receipt.id,
  });

  return NextResponse.json({ document, receipt });
}
