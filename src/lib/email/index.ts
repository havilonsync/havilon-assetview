// Email service using Resend (swap for SendGrid by changing the fetch target)
// Install: npm install resend
// Set RESEND_API_KEY in .env

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@havilon.com";
const FROM_NAME = process.env.FROM_NAME ?? "Havilon AssetView™";

interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

async function sendEmail(payload: EmailPayload): Promise<{ id: string } | null> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set — email not sent:", payload.subject);
    return null;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.replyTo,
    }),
  });

  if (!res.ok) {
    console.error("[Email] Send failed:", await res.text());
    return null;
  }

  return res.json();
}

// ─── Transactional email templates ────────────────────────────────────

export async function sendLeaseRenewalOffer(to: string, tenantName: string, unitAddress: string, newRent: number, expiryDate: string) {
  return sendEmail({
    to,
    subject: `Your lease renewal offer — ${unitAddress}`,
    html: `
      <h2>Hi ${tenantName},</h2>
      <p>Your lease at <strong>${unitAddress}</strong> expires on <strong>${expiryDate}</strong>.</p>
      <p>We'd love to have you stay. Your renewal rent would be <strong>$${newRent.toLocaleString()}/month</strong>.</p>
      <p>Please reply to this email or log in to your tenant portal to accept or discuss options.</p>
      <p>Best,<br/>The Havilon Team</p>
    `,
  });
}

export async function sendDisbursementNotice(to: string, ownerName: string, amount: number, period: string, receiptNumber: string) {
  return sendEmail({
    to,
    subject: `Your trust disbursement — ${period}`,
    html: `
      <h2>Hi ${ownerName},</h2>
      <p>Your monthly trust disbursement of <strong>$${amount.toLocaleString()}</strong> for <strong>${period}</strong> has been processed.</p>
      <p>Receipt number: <strong>${receiptNumber}</strong></p>
      <p>Log in to your owner portal to view the full statement and breakdown.</p>
      <p>Best,<br/>The Havilon Team</p>
    `,
  });
}

export async function sendWorkOrderUpdate(to: string, woNumber: string, title: string, status: string, vendorName?: string) {
  return sendEmail({
    to,
    subject: `Work order ${woNumber} update — ${status}`,
    html: `
      <h2>Work order update</h2>
      <p><strong>${woNumber}:</strong> ${title}</p>
      <p>Status: <strong>${status}</strong>${vendorName ? ` · Assigned to: <strong>${vendorName}</strong>` : ""}</p>
      <p>Log in to the portal for full details.</p>
    `,
  });
}

export async function sendInvoiceEmail(to: string, invoiceNumber: string, toName: string, amount: number, dueDate: string) {
  return sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} from Havilon`,
    html: `
      <h2>Invoice ${invoiceNumber}</h2>
      <p>Hi ${toName},</p>
      <p>Amount due: <strong>$${amount.toLocaleString()}</strong></p>
      <p>Due date: <strong>${dueDate}</strong></p>
      <p>Log in to pay or download a PDF copy.</p>
    `,
  });
}

export async function sendComplianceAlert(to: string[], itemTitle: string, propertyAddress: string, dueDate: string) {
  return sendEmail({
    to,
    subject: `⚠️ Compliance item due — ${itemTitle}`,
    html: `
      <h2>Compliance alert</h2>
      <p><strong>${itemTitle}</strong> at ${propertyAddress} is due on <strong>${dueDate}</strong>.</p>
      <p>Please take action to avoid regulatory risk. Log in to the platform to update the status.</p>
    `,
  });
}

export async function sendWelcomeEmail(to: string, name: string, companyName: string, tempPassword: string) {
  return sendEmail({
    to,
    subject: `Welcome to Havilon AssetView™ — ${companyName}`,
    html: `
      <h2>Welcome, ${name}!</h2>
      <p>Your account on Havilon AssetView™ for <strong>${companyName}</strong> has been created.</p>
      <p>Temporary password: <strong>${tempPassword}</strong></p>
      <p>Please log in and change your password immediately.</p>
      <a href="${process.env.NEXTAUTH_URL}/login" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:12px;">Log in now</a>
    `,
  });
}
