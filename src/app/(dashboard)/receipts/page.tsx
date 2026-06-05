import { db } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Lock, ShieldCheck } from "lucide-react";

export default function ReceiptsPage() {
  const detail = db.receipts[0];
  const typeCounts = db.receipts.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeVariant: Record<string, "green" | "blue" | "purple" | "amber" | "gray"> = {
    lease: "green", payment: "blue", document: "purple", claim: "amber", disbursement: "gray",
  };

  return (
    <>
      <PageTopBar title="Submission Receipts & Chain of Custody" subtitle="Auto-issued · Immutable · SHA-256 verified · Auditable">
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <ShieldCheck size={13} />
          <span>All receipts verified</span>
        </div>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Receipts Issued (30d)" value={184} />
          <MetricCard label="Document Submissions" value={62} />
          <MetricCard label="Payment Receipts" value={118} />
          <MetricCard label="Action Receipts" value={4} />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Recent Receipts</CardTitle></CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Receipt #</Th><Th>Type</Th><Th>Issued To</Th>
                <Th>Event</Th><Th>Amount</Th><Th>Timestamp</Th><Th>Hash</Th>
              </tr>
            </thead>
            <tbody>
              {db.receipts.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-mono text-xs">{r.receiptNumber}</Td>
                  <Td><Badge variant={typeVariant[r.type] ?? "gray"}>{r.type}</Badge></Td>
                  <Td>{r.issuedTo}</Td>
                  <Td className="text-xs text-slate-600 max-w-[160px] truncate">{r.eventDescription}</Td>
                  <Td>{r.amount ? formatCurrency(r.amount) : "—"}</Td>
                  <Td className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Td>
                  <Td className="font-mono text-xs text-slate-400">{r.hash.slice(0, 8)}…</Td>
                  <Td><Btn>View</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader>
              <CardTitle>Receipt #{detail.receiptNumber} — Full Detail</CardTitle>
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <Lock size={11} />
                <span>Immutable</span>
              </div>
            </CardHeader>
            <FieldRow label="Receipt ID" value={<span className="font-mono text-xs">{detail.receiptNumber}</span>} />
            <FieldRow label="Event type" value={detail.eventType} />
            <FieldRow label="Description" value={detail.eventDescription} />
            <FieldRow label="Issued to" value={detail.issuedTo} />
            <FieldRow label="Issued by" value="System (auto)" />
            <FieldRow label="Timestamp" value={<span className="font-mono text-xs">{detail.createdAt}</span>} />
            <FieldRow label="SHA-256 hash" value={<span className="font-mono text-xs text-slate-500">{detail.hash}</span>} />
            <FieldRow label="Immutable" value={<Badge variant="green">Yes</Badge>} />
            <FieldRow label="Delivered via" value="Email + portal" />
          </Card>

          <Card>
            <CardHeader><CardTitle>Receipt Type Breakdown (30d)</CardTitle></CardHeader>
            {Object.entries(typeCounts).map(([type, count]) => (
              <FieldRow key={type} label={<span className="capitalize">{type} receipts</span>} value={
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, count * 20)}%` }} />
                  </div>
                  <span>{count}</span>
                </div>
              } />
            ))}
            <div className="mt-4 bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <span className="font-semibold">Chain of Custody:</span> Every submission, payment, document upload, and action in AssetView automatically generates an immutable, SHA-256 hashed receipt delivered to all relevant parties.
            </div>
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
