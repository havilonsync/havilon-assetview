import { db } from "@/lib/store";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, Table, Th, Td, Tr, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Plus, ChevronRight, Check, Clock } from "lucide-react";

function WorkflowSteps({ current, total, steps }: { current: number; total: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap mt-3">
      {steps.map((step, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${
              done ? "bg-emerald-50 text-emerald-700" : active ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "bg-slate-50 text-slate-400"
            }`}>
              {done ? <Check size={10} /> : active ? <Clock size={10} /> : null}
              {step}
            </div>
            {i < steps.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
          </div>
        );
      })}
    </div>
  );
}

export default function WorkflowPage() {
  const active = db.workflowInstances.filter((w) => w.status === "active").length;
  const completed = 42;
  const awaiting = 7;
  const automationRate = 74;

  return (
    <>
      <PageTopBar title="Workflow Engine" subtitle="Configurable workflows · Automation · Onboarding · Claims · Evictions">
        <Btn variant="primary"><Plus size={13} /> New Workflow</Btn>
      </PageTopBar>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <MetricCard label="Active Workflows" value={active} />
          <MetricCard label="Completed (30d)" value={completed} />
          <MetricCard label="Awaiting Input" value={awaiting} />
          <MetricCard label="Automation Rate" value={`${automationRate}%`} />
        </div>

        <Card>
          <CardHeader><CardTitle>Workflow Templates</CardTitle></CardHeader>
          <Table>
            <thead>
              <tr><Th>Workflow</Th><Th>Trigger</Th><Th>Steps</Th><Th>Auto-Actions</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {db.workflowTemplates.map((wt) => (
                <Tr key={wt.id}>
                  <Td className="font-medium">{wt.name}</Td>
                  <Td className="text-xs text-slate-500">{wt.trigger}</Td>
                  <Td>{wt.steps}</Td>
                  <Td className="text-xs text-slate-500 max-w-[200px]">{wt.automations.join(", ")}</Td>
                  <Td><Badge variant={wt.active ? "green" : "gray"}>{wt.active ? "Active" : "Inactive"}</Badge></Td>
                  <Td><Btn>Edit</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active Workflow Instances</CardTitle></CardHeader>
          <div className="space-y-4">
            {db.workflowInstances.map((wi) => {
              const template = db.workflowTemplates.find((t) => t.id === wi.templateId);
              const allSteps = template?.name === "Lease renewal"
                ? ["Renewal sent", "Awaiting reply", "Counter/Accept", "Sign lease", "Close & receipt"]
                : template?.name === "Eviction process"
                ? ["3-Day notice", "File UD", "Hearing", "Judgment", "Writ", "Lockout", "Cleanup", "Relist", "Deposit", "Close"]
                : template?.name === "Client onboarding"
                ? ["Agreement", "KYC/ID", "Asset Import", "Lease Upload", "Financials", "Insurance", "Go Live"]
                : ["Filed", "Adjuster", "Docs", "Inspect", "Review", "Decision", "Payment", "Close"];
              return (
                <div key={wi.id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{wi.templateName}</div>
                      <div className="text-xs text-slate-500">{wi.entityLabel} · Started {wi.startedAt}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Step {wi.currentStep}/{wi.totalSteps}</span>
                      <Badge variant={statusVariant(wi.status)}>{wi.status}</Badge>
                    </div>
                  </div>
                  <WorkflowSteps current={wi.currentStep} total={wi.totalSteps} steps={allSteps} />
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}

