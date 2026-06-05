export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/auth/session";

export async function POST(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;

  // Gather live data from DB for context
  const [assets, leases, workOrders, complianceItems, trustAccounts, invoices] = await Promise.all([
    prisma.asset.findMany({ where: { companyId: ctx.companyId } }),
    prisma.lease.findMany({ where: { unit: { property: { companyId: ctx.companyId } } } }),
    prisma.workOrder.findMany({ where: { companyId: ctx.companyId, status: { not: "complete" } } }),
    prisma.complianceItem.findMany({ where: { companyId: ctx.companyId, status: { in: ["overdue", "due_soon"] } } }),
    prisma.trustAccount.findMany({ where: { companyId: ctx.companyId } }),
    prisma.invoice.findMany({ where: { companyId: ctx.companyId, status: { in: ["pending", "overdue"] } } }),
  ]);

  const totalUnits = assets.reduce((s, a) => s + a.units, 0);
  const occupiedUnits = assets.reduce((s, a) => s + a.occupiedUnits, 0);
  const trustBalance = trustAccounts.reduce((s, t) => s + Number(t.balance), 0);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const expiringLeases = leases.filter((l) => {
    const days = Math.ceil((new Date(l.endDate).getTime() - Date.now()) / 86400000);
    return days <= 60 && l.status === "active";
  });

  const portfolioSnapshot = {
    totalAssets: assets.length,
    totalUnits,
    occupiedUnits,
    occupancyRate: Math.round((occupiedUnits / Math.max(totalUnits, 1)) * 100),
    openWorkOrders: workOrders.length,
    emergencyWOs: workOrders.filter((w) => w.priority === "emergency").length,
    overdueComplianceItems: complianceItems.filter((c) => c.status === "overdue").length,
    dueSoonComplianceItems: complianceItems.filter((c) => c.status === "due_soon").length,
    trustBalance,
    overdueInvoiceCount: overdueInvoices.length,
    overdueInvoiceAmount: overdueInvoices.reduce((s, i) => s + Number(i.total), 0),
    leasesExpiringSoon: expiringLeases.length,
  };

  const prompt = `You are an AI assistant for Havilon AssetView™, a property management platform. 
Analyze this real-time portfolio snapshot and provide a concise, actionable summary in 3-4 paragraphs.
Focus on: occupancy health, financial position, urgent operational items, and upcoming risks.
Be specific with numbers. Flag anything requiring immediate action.

Portfolio snapshot:
${JSON.stringify(portfolioSnapshot, null, 2)}`;

  if (!process.env.ANTHROPIC_API_KEY) {
    // Return structured mock if no API key set
    return NextResponse.json({
      summary: `Portfolio is ${portfolioSnapshot.occupancyRate}% occupied (${portfolioSnapshot.occupiedUnits}/${portfolioSnapshot.totalUnits} units). ${portfolioSnapshot.emergencyWOs > 0 ? `⚠️ ${portfolioSnapshot.emergencyWOs} emergency work order(s) require immediate attention.` : "No emergency work orders."} ${portfolioSnapshot.overdueComplianceItems > 0 ? `${portfolioSnapshot.overdueComplianceItems} compliance item(s) are overdue.` : ""} ${portfolioSnapshot.leasesExpiringSoon > 0 ? `${portfolioSnapshot.leasesExpiringSoon} lease(s) expire within 60 days.` : ""} Trust balance: $${portfolioSnapshot.trustBalance.toLocaleString()}.`,
      snapshot: portfolioSnapshot,
      generatedAt: new Date().toISOString(),
      source: "mock",
    });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
  }

  const data = await response.json();
  const summary = data.content?.[0]?.text ?? "Unable to generate summary.";

  return NextResponse.json({
    summary,
    snapshot: portfolioSnapshot,
    generatedAt: new Date().toISOString(),
    source: "anthropic",
  });
}
