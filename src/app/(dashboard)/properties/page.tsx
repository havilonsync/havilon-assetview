import { db } from "@/lib/store";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Timeline, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Plus } from "lucide-react";

export default function PropertiesPage() {
  const totalUnits = db.assets.reduce((s, a) => s + a.units, 0);
  const occupied = db.assets.reduce((s, a) => s + a.occupiedUnits, 0);
  const vacantLease = db.leases.find((l) => l.status === "vacant");
  const expiringSoon = db.leases.find((l) => l.status === "expiring_soon");

  return (
    <>
      <PageTopBar title="Properties & Units" subtitle="Buildings · Units · Tenants · Leases">
        <Btn variant="primary"><Plus size={13} /> Add Property</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Buildings" value={db.properties.length} />
          <MetricCard label="Total Units" value={totalUnits} />
          <MetricCard label="Occupied" value={occupied} sub={`${Math.round((occupied / totalUnits) * 100)}%`} />
          <MetricCard label="Avg Rent" value="$2,407" />
        </MetricsGrid>

        <Card>
          <CardHeader>
            <CardTitle>Active Leases</CardTitle>
            <Btn>Export</Btn>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Unit</Th><Th>Tenant</Th><Th>Rent</Th>
                <Th>Start</Th><Th>End</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {db.leases.map((lease) => (
                <Tr key={lease.id}>
                  <Td className="font-medium">{lease.unitAddress}</Td>
                  <Td>{lease.tenantName || "—"}</Td>
                  <Td>{lease.monthlyRent ? formatCurrency(lease.monthlyRent) + "/mo" : "—"}</Td>
                  <Td>{lease.startDate ? formatDateShort(lease.startDate) : "—"}</Td>
                  <Td>{lease.endDate ? formatDateShort(lease.endDate) : "—"}</Td>
                  <Td>
                    <Badge variant={statusVariant(lease.status)}>
                      {lease.status.replace("_", " ")}
                    </Badge>
                  </Td>
                  <Td>
                    <Btn>{lease.status === "vacant" ? "List Unit" : "View"}</Btn>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        {expiringSoon && (
          <TwoCol>
            <Card>
              <CardHeader>
                <CardTitle>Unit 7A — {expiringSoon.tenantName}</CardTitle>
                <Badge variant="amber">Expiring Soon</Badge>
              </CardHeader>
              <FieldRow label="Unit" value={expiringSoon.unitAddress} />
              <FieldRow label="Tenant" value={expiringSoon.tenantName} />
              <FieldRow label="Rent" value={`${formatCurrency(expiringSoon.monthlyRent)}/mo`} />
              <FieldRow label="Deposit Held" value={formatCurrency(expiringSoon.depositAmount)} />
              <FieldRow
                label="Balance"
                value={<span className="text-emerald-600">$0.00 (Current)</span>}
              />
              <FieldRow label="Late payments (12mo)" value={expiringSoon.latePayments} />
              <div className="mt-4">
                <Btn variant="primary">Send Renewal Offer</Btn>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Lease Activity</CardTitle></CardHeader>
              <Timeline items={[
                { text: `Rent collected — ${formatCurrency(expiringSoon.monthlyRent)}`, sub: "May 1, 2026", color: "green" },
                { text: "Renewal notice sent (auto)", sub: "Apr 30, 2026", color: "blue" },
                { text: "Annual inspection passed", sub: "Mar 3, 2026", color: "blue" },
              ]} />
            </Card>
          </TwoCol>
        )}
      </SectionPage>
    </>
  );
}
