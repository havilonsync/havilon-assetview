import { db } from "@/lib/store";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Plus, Download, Database, FileText, Archive, FileSpreadsheet } from "lucide-react";

const checklist = [
  { label: "Final owner statement", status: "complete" },
  { label: "Security deposit reconciliation", status: "complete" },
  { label: "Final maintenance invoice", status: "pending" },
  { label: "Lease termination notices", status: "complete" },
  { label: "Data export package", status: "in_progress" },
  { label: "Closeout letter signed", status: "awaiting" },
];

export default function CloseoutPage() {
  return (
    <>
      <PageTopBar title="Closeout & Archive" subtitle="Final reports · Data export · Business continuity · Full lifecycle preservation">
        <Btn variant="primary"><Plus size={13} /> New Closeout</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Engagements Closed" value={12} sub="All time" />
          <MetricCard label="In Progress" value={1} />
          <MetricCard label="Archive Storage" value="84 GB" />
          <MetricCard label="Export Requests" value={3} sub="Pending" />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Closeout Engagements</CardTitle></CardHeader>
          <Table>
            <thead>
              <tr><Th>Client</Th><Th>Properties</Th><Th>Initiated</Th><Th>Progress</Th><Th>Status</Th><Th>Package</Th></tr>
            </thead>
            <tbody>
              {db.closeouts.map((co) => (
                <Tr key={co.id}>
                  <Td className="font-medium">{co.clientName}</Td>
                  <Td>{co.propertyCount}</Td>
                  <Td>{co.initiatedAt}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${co.checklistProgress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{co.checklistProgress}%</span>
                    </div>
                  </Td>
                  <Td><Badge variant={statusVariant(co.status)}>{co.status.replace("_", " ")}</Badge></Td>
                  <Td>
                    <Btn>
                      <Download size={11} />
                      {co.status === "in_progress" ? "Draft" : "Download"}
                    </Btn>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader>
              <CardTitle>J. Anderson — Closeout Checklist</CardTitle>
              <span className="text-xs text-slate-500">{checklist.filter(c => c.status === "complete").length}/{checklist.length} complete</span>
            </CardHeader>
            {checklist.map((item) => {
              const v = item.status === "complete" ? "green" : item.status === "pending" || item.status === "in_progress" ? "amber" : "red";
              return (
                <FieldRow
                  key={item.label}
                  label={item.label}
                  value={<Badge variant={v as "green" | "amber" | "red"}>{item.status.replace("_", " ")}</Badge>}
                />
              );
            })}
          </Card>

          <Card>
            <CardHeader><CardTitle>Data Portability</CardTitle></CardHeader>
            <p className="text-sm text-slate-500 mb-4">Export complete asset history, all documents, financial records, and lifecycle events for any client engagement.</p>
            <div className="space-y-2">
              <Btn className="w-full justify-start">
                <FileSpreadsheet size={13} />
                Export Financial Records (CSV)
              </Btn>
              <Btn className="w-full justify-start">
                <Archive size={13} />
                Export All Documents (ZIP)
              </Btn>
              <Btn className="w-full justify-start">
                <Database size={13} />
                Full Data Export (JSON)
              </Btn>
              <Btn className="w-full justify-start">
                <FileText size={13} />
                Generate Closeout Report (PDF)
              </Btn>
            </div>
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
