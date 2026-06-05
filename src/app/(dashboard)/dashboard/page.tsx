"use client";
import { useDashboard } from "@/hooks/useAPI";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, ProgressBar, Table, Th, Td, Tr, Timeline, AIBox, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Bell, CheckCircle, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { data, loading, error } = useDashboard();

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Loader2 className="animate-spin text-slate-400" size={24} />
    </div>
  );

  // Fallback to store data while DB isn't connected
  const occ = data?.occupancy ?? { rate: 83, occupiedUnits: 118, totalUnits: 142 };
  const wos = data?.workOrders ?? { open: 27, overdue: 5 };
  const trust = data?.trust ?? { accounts: 48, balance: 1200000, reserves: 186000 };
  const compliance = data?.compliance ?? { overdue: 2 };
  const invoices = data?.invoices ?? { outstanding: 2, outstandingAmount: 15700 };

  return (
    <>
      <PageTopBar title="Dashboard" subtitle="Havilon Realty · May 2026">
        <Badge variant="green"><CheckCircle size={10} /> All Systems Operational</Badge>
        <Btn><Bell size={12} /> 4</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Total Units" value={occ.totalUnits} sub="↑ 3 this month" />
          <MetricCard label="Occupied" value={occ.occupiedUnits} sub={`${occ.rate}% occupancy`} />
          <MetricCard label="MRR" value="$284K" sub="↑ 6.2% MoM" />
          <MetricCard label="Open Work Orders" value={wos.open} sub={`${wos.overdue} overdue`} valueColor={wos.overdue > 0 ? "text-red-500" : undefined} />
          <MetricCard label="Trust Balance" value={formatCurrency(trust.balance + trust.reserves)} sub={`${trust.accounts} owner accounts`} />
          <MetricCard label="Compliance Issues" value={compliance.overdue} sub="overdue items" valueColor={compliance.overdue > 0 ? "text-red-500" : undefined} />
        </MetricsGrid>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>Recent Activity</CardTitle><Btn>View all</Btn></CardHeader>
            <Timeline items={[
              { text: "Lease renewal signed — Unit 4B, 220 Oak Ave", sub: "2 hours ago · Receipt #R-2847 issued", color: "blue" },
              { text: "Insurance claim #CLM-0091 approved — $12,400", sub: "Yesterday · Allstate", color: "green" },
              { text: "Work order WO-1144 escalated — HVAC failure", sub: "Yesterday · 5501 Maple St", color: "amber" },
              { text: "New owner onboarding — R. Thornton", sub: "2 days ago · 3 properties imported", color: "amber" },
              { text: "Trust disbursement — $18,200 to 6 owners", sub: "3 days ago", color: "blue" },
            ]} />
          </Card>

          <Card>
            <CardHeader><CardTitle>Portfolio Health</CardTitle></CardHeader>
            {[
              { label: "Occupancy Rate", pct: occ.rate, color: "blue" },
              { label: "Rent Collection (May)", pct: 97, color: "green" },
              { label: "Maintenance SLA Met", pct: 91, color: "amber" },
              { label: "Insurance Coverage", pct: 100, color: "green" },
              { label: "Compliance Current", pct: 100 - compliance.overdue * 12, color: "red" },
            ].map((item) => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.pct}%</span>
                </div>
                <ProgressBar value={item.pct} color={item.color} />
              </div>
            ))}
            <AIBox>3 leases expire within 60 days with no renewal initiated. Occupancy risk: moderate. Recommend outreach to Units 7A, 12C, 3B.</AIBox>
          </Card>
        </TwoCol>

        <Card>
          <CardHeader>
            <CardTitle>Outstanding Invoices</CardTitle>
            <span className="text-xs text-slate-500">{formatCurrency(invoices.outstandingAmount)} total outstanding</span>
          </CardHeader>
          <Table>
            <thead><tr><Th>Invoice</Th><Th>Client</Th><Th>Amount</Th><Th>Due</Th><Th>Status</Th></tr></thead>
            <tbody>
              <Tr><Td className="font-mono text-xs">INV-0841</Td><Td>L. Kim</Td><Td>$14,200</Td><Td>Jun 1</Td><Td><Badge variant="amber">Pending</Badge></Td></Tr>
              <Tr><Td className="font-mono text-xs">INV-0840</Td><Td>R. Thornton</Td><Td>$1,500</Td><Td>Jun 1</Td><Td><Badge variant="amber">Pending</Badge></Td></Tr>
              <Tr><Td className="font-mono text-xs">INV-0829</Td><Td>P. Walsh</Td><Td>$840</Td><Td>May 15</Td><Td><Badge variant="red">Overdue</Badge></Td></Tr>
            </tbody>
          </Table>
        </Card>
      </SectionPage>
    </>
  );
}
