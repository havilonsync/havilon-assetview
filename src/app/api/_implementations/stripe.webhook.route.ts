export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// Stripe webhook endpoint — receives payment_intent.succeeded, invoice.paid, etc.
// Set STRIPE_WEBHOOK_SECRET in .env and point your Stripe dashboard to /api/stripe/webhook

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 400 });
  }

  let event: any;

  try {
    // In production: const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    //                event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    event = JSON.parse(body); // placeholder parse for scaffold
  } catch (err) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object;
      const invoiceId = paymentIntent.metadata?.invoiceId;
      if (invoiceId) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: "paid", paidAt: new Date(), paidAmount: paymentIntent.amount / 100 },
        });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object;
      const invoiceId = paymentIntent.metadata?.invoiceId;
      if (invoiceId) {
        // Log failure but don't change status — let retry logic handle it
        await prisma.auditLog.create({
          data: {
            companyId: paymentIntent.metadata?.companyId ?? "unknown",
            action: "payment_failed",
            entity: "Invoice",
            entityId: invoiceId,
            metadata: { reason: paymentIntent.last_payment_error?.message },
          },
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      // SaaS plan cancellation — downgrade company
      const subscription = event.data.object;
      const companyId = subscription.metadata?.companyId;
      if (companyId) {
        await prisma.company.update({
          where: { id: companyId },
          data: { plan: "starter", status: "active" },
        });
      }
      break;
    }

    default:
      // Unhandled event type — acknowledge receipt
      break;
  }

  return NextResponse.json({ received: true });
}
