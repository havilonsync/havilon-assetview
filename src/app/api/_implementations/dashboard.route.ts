export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/auth/session";

export async function GET(request: NextRequest) {
  const ctx = await requireRole(request, ["admin", "manager"]);
  if (ctx instanceof NextResponse) return ctx;
  const { companyId } = ctx;

  const [assetStats, openWOs, overdueWOs, overdueCompliance, trustAccounts, expiringLeases, openInvoices, recentActivity] = await Promise.all([
    prisma.asset.aggregate({ where: { companyId }, _count: { id: true }, _sum: { units: true, occupiedUnits: true, currentValue: true } }),
    prisma.workOrder.count({ where: { companyId, status: { notIn: ["complete", "cancelled"] } } }),
    prisma.workOrder.count({ where: { companyId, status: "overdue" } }),
    prisma.complianceItem.count({ where: { companyId, status: "overdue" } }),
    prisma.trustAccount.aggregate({ where: { companyId }, _count: { id: true }, _sum: { balance: true, reserveBalance: true } }),
    prisma.lease.count({ where: { unit: { property: { companyId } }, status: "active", endDate: { gte: new Date(), lte: new Date(Date.now() + 60 * 86400000) } } }),
    prisma.invoice.aggregate({ where: { companyId, status: { in: ["pending", "overdue"] } }, _count: { id: true }, _sum: { total: true } }),
    prisma.auditLog.findMany({ where: { companyId }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const totalUnits = Number(assetStats._sum.units ?? 0);
  const occupiedUnits = Number(assetStats._sum.occupiedUnits ?? 0);

  return NextResponse.json({
    assets: { count: assetStats._count.id, totalValue: Number(assetStats._sum.currentValue ?? 0) },
    occupancy: { totalUnits, occupiedUnits, rate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0 },
    workOrders: { open: openWOs, overdue: overdueWOs },
    compliance: { overdue: overdueCompliance },
    trust: { accounts: trustAccounts._count.id, balance: Number(trustAccounts._sum.balance ?? 0), reserves: Number(trustAccounts._sum.reserveBalance ?? 0) },
    invoices: { outstanding: openInvoices._count.id, outstandingAmount: Number(openInvoices._sum.total ?? 0) },
    expiringLeases,
    recentActivity,
  });
}
