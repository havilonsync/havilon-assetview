import { db } from "@/lib/store";
import { formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, Timeline, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";

export default function CompliancePage() {
  const overdue = db.complianceItems.filter((c) => c.status === "overdue").length;
  const legalHolds = db.legalMatters.filter((l) => l.legalHold).length;
  const evictions = db.legalMatters.filter((l) => l.type === "eviction").length;

  return (
    <>
      <PageTopBar title="Compliance & Litigation" subtitle="Deadlines · Renewals · Filings · Legal Holds" />
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Open Items" value={db.complianceItems.filter((c) => c.status !== "complete").length} />
          <MetricCard label="Overdue" value={overdue} valueColor={overdue > 0 ? "text-red-500" : undefined} />
          <MetricCard label="Legal Holds" value={legalHolds} />
          <MetricCard label="Evictions Active" value={evictions} />
        </MetricsGrid>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Calendar</CardTitle>
            <Btn variant="primary">+ Add Item</Btn>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Item</Th><Th>Property</Th><Th>Category</Th>
                <Th>Due</Th><Th>Assigned</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {db.complianceItems.map((item) => (
                <Tr key={item.id}>
                  <Td className="font-medium">{item.title}</Td>
                  <Td>{item.propertyAddress}</Td>
                  <Td><span className="capitalize">{item.category}</span></Td>
                  <Td>{formatDateShort(item.dueDate)}</Td>
                  <Td>{item.assignedTo}</Td>
                  <Td><Badge variant={statusVariant(item.status)}>{item.status.replace("_", " ")}</Badge></Td>
                  <Td><Btn>{item.status === "overdue" ? "Resolve" : "View"}</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>Active Legal Matters</CardTitle></CardHeader>
            <div className="space-y-4">
              {db.legalMatters.map((matter) => (
                <div key={matter.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-sm font-semibold text-slate-800">{matter.title}</div>
                    <Badge variant={statusVariant(matter.status)}>{matter.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                    Type: {matter.type} · Attorney: {matter.attorney}
                    {matter.hearingDate && ` · Hearing: ${formatDateShort(matter.hearingDate)}`}
                  </div>
                  {matter.legalHold && (
                    <div className="text-xs text-red-500 mt-0.5">⚠ Insurance hold active</div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Eviction Workflow — Unit 2</CardTitle></CardHeader>
            <Timeline items={[
              { text: "3-day notice served", sub: "May 3, 2026", color: "green" },
              { text: "Unlawful detainer filed", sub: "May 10, 2026", color: "green" },
              { text: "Court hearing scheduled", sub: "Jun 18 · Pending", color: "blue" },
              { text: "Writ of possession", sub: "Pending outcome", color: "gray" },
              { text: "Lockout / enforcement", sub: "Pending", color: "gray" },
            ]} />
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
