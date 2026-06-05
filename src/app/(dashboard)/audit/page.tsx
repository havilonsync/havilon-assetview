import { db } from "@/lib/store";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { UserPlus, CheckCircle, Clock, XCircle } from "lucide-react";

function DocStatusIcon({ status }: { status: string }) {
  if (status === "provided") return <CheckCircle size={14} className="text-emerald-500" />;
  if (status === "in_review") return <Clock size={14} className="text-amber-500" />;
  return <XCircle size={14} className="text-slate-300" />;
}

export default function AuditPage() {
  const totalRequested = db.auditDocumentRequests.length;
  const provided = db.auditDocumentRequests.filter((r) => r.status === "provided").length;

  return (
    <>
      <PageTopBar title="Audit Portal" subtitle="Read-only access · Engagement letters · Audit packets">
        <Btn variant="primary"><UserPlus size={13} /> Invite Auditor</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Active Engagements" value={db.auditEngagements.length} />
          <MetricCard label="Audit Packets Ready" value={1} />
          <MetricCard label="Items Requested" value={totalRequested} />
          <MetricCard label="Items Provided" value={provided} />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Active Audit Engagements</CardTitle></CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Engagement</Th><Th>Firm</Th><Th>Auditor</Th>
                <Th>Scope</Th><Th>Period</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {db.auditEngagements.map((ae) => (
                <Tr key={ae.id}>
                  <Td className="font-medium">{ae.scope}</Td>
                  <Td>{ae.firmName}</Td>
                  <Td>{ae.auditorName}</Td>
                  <Td>Full portfolio</Td>
                  <Td>{ae.period}</Td>
                  <Td><Badge variant={statusVariant(ae.status)}>{ae.status.replace("_", " ")}</Badge></Td>
                  <Td><Btn>Manage</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader>
              <CardTitle>Document Requests — T. Franklin</CardTitle>
              <span className="text-xs text-slate-500">{provided}/{totalRequested} provided</span>
            </CardHeader>
            <div className="space-y-2">
              {db.auditDocumentRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2 text-sm">
                    <DocStatusIcon status={req.status} />
                    <span className={req.status === "pending" ? "text-slate-400" : "text-slate-700"}>{req.description}</span>
                  </div>
                  <Badge variant={statusVariant(req.status)}>{req.status.replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Audit Access Control</CardTitle></CardHeader>
            <FieldRow label="T. Franklin (Grant & Wise)" value={<Badge variant="blue">Read-only</Badge>} />
            <FieldRow label="M. Okafor (State Reg.)" value={<Badge variant="blue">Read-only</Badge>} />
            <FieldRow label="Trust accounts" value="Restricted view" />
            <FieldRow label="Tenant PII" value="Redacted" />
            <FieldRow label="Session logging" value={<Badge variant="green">Enabled</Badge>} />
            <FieldRow label="Data export allowed" value={<Badge variant="amber">With approval</Badge>} />
            <FieldRow label="IP allowlist" value={<Badge variant="green">Enforced</Badge>} />
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
