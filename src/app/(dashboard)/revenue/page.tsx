import { db } from "@/lib/store";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Plus, Settings } from "lucide-react";

const revenueCategories = [
  { label: "Management fees", value: 34100 },
  { label: "Leasing fees", value: 8200 },
  { label: "Maintenance markup", value: 9400 },
  { label: "Lease renewal fees", value: 3800 },
  { label: "Late fees", value: 1100 },
];

export default function RevenuePage() {
  const totalRevenue = revenueCategories.reduce((s, r) => s + r.value, 0);
  const outstanding = db.invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.total, 0);
  const collected = db.invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);

  return (
    <>
      <PageTopBar title="Revenue Operations" subtitle="Contract-driven pricing · Invoicing · Reconciliation · Profitability">
        <Btn variant="primary"><Plus size={13} /> New Invoice</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="MRR" value="$284K" sub="↑ 6.2%" />
          <MetricCard label="Collected (May)" value={formatCurrency(collected)} sub="97.2%" />
          <MetricCard label="Outstanding" value={formatCurrency(outstanding)} />
          <MetricCard label="Mgmt Fee Revenue" value={formatCurrency(34100)} />
          <MetricCard label="Maintenance Rev." value={formatCurrency(9400)} />
          <MetricCard label="Net Margin" value="28.4%" />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Open Invoices</CardTitle></CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Invoice</Th><Th>To</Th><Th>Description</Th>
                <Th>Amount</Th><Th>Due</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {db.invoices.map((inv) => (
                <Tr key={inv.id}>
                  <Td className="font-mono text-xs">{inv.invoiceNumber}</Td>
                  <Td>{inv.toName}</Td>
                  <Td className="text-xs text-slate-600">{inv.description}</Td>
                  <Td className="font-medium">{formatCurrency(inv.total)}</Td>
                  <Td>{formatDateShort(inv.dueDate)}</Td>
                  <Td><Badge variant={statusVariant(inv.status)}>{inv.status}</Badge></Td>
                  <Td>
                    <div className="flex gap-1">
                      <Btn>View</Btn>
                      {inv.status !== "paid" && <Btn>Mark Paid</Btn>}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>Revenue by Category (May)</CardTitle></CardHeader>
            {revenueCategories.map((r) => (
              <FieldRow key={r.label} label={r.label} value={formatCurrency(r.value)} />
            ))}
            <div className="flex justify-between items-start py-2 font-semibold text-sm border-t border-slate-200 mt-1">
              <span>Total</span>
              <span className="text-emerald-700">{formatCurrency(totalRevenue)}</span>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing Engine</CardTitle>
              <Btn><Settings size={12} /> Edit Rules</Btn>
            </CardHeader>
            {db.pricingRules.map((rule) => (
              <FieldRow
                key={rule.id}
                label={rule.name}
                value={
                  <span className="text-xs">
                    {rule.rateType === "percentage" ? `${rule.rate}%` : formatCurrency(rule.rate) + " flat"}
                  </span>
                }
              />
            ))}
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
