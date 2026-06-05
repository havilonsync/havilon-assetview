import { db } from "@/lib/store";
import {
  Card, CardHeader, CardTitle, PageTopBar, SectionPage,
  Table, Th, Td, Tr, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Plus, Upload, FileCheck } from "lucide-react";

const STEPS = ["Agreement", "KYC / ID", "Asset Import", "Lease Upload", "Financials", "Insurance", "Go Live"];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1 my-4 overflow-x-auto pb-1">
      {STEPS.map((name, i) => {
        const stepNum = i + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        const pending = stepNum > current;
        return (
          <div key={name} className="flex items-center gap-1 flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  done ? "bg-blue-600 text-white" : active ? "bg-blue-600 text-white ring-2 ring-blue-200" : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : stepNum}
              </div>
              <div className={`text-[10px] mt-1 whitespace-nowrap ${active ? "font-semibold text-slate-800" : "text-slate-400"}`}>{name}</div>
            </div>
            {i < STEPS.length - 1 && <div className={`w-6 h-px mt-[-14px] ${stepNum < current ? "bg-blue-400" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const inProgress = db.onboardings.find((o) => o.status === "in_progress");
  return (
    <>
      <PageTopBar title="Client Onboarding" subtitle="Historical imports · Document collection · 7-step wizard">
        <Btn variant="primary"><Plus size={13} /> Start Onboarding</Btn>
      </PageTopBar>
      <div className="p-6 space-y-4">
        {inProgress && (
          <Card>
            <CardHeader>
              <CardTitle>{inProgress.clientName} — Onboarding in Progress</CardTitle>
              <Badge variant="amber">Step {inProgress.currentStep} of {inProgress.totalSteps}</Badge>
            </CardHeader>
            <StepIndicator current={inProgress.currentStep} total={inProgress.totalSteps} />
            <div className="mt-4">
              <div className="text-sm font-semibold mb-3">Step 3: Asset Import</div>
              <Table>
                <thead><tr><Th>Address</Th><Th>Type</Th><Th>Units</Th><Th>Records Imported</Th><Th>Status</Th></tr></thead>
                <tbody>
                  <Tr><Td>220 Oak Ave, Dallas TX</Td><Td>Multi-family</Td><Td>8</Td><Td>Lease, Deed, Insurance</Td><Td><Badge variant="green">Complete</Badge></Td></Tr>
                  <Tr><Td>5501 Maple St, Dallas TX</Td><Td>Single-family</Td><Td>1</Td><Td>Deed, HOA docs</Td><Td><Badge variant="amber">Pending lease</Badge></Td></Tr>
                  <Tr><Td>900 Commerce Blvd #12</Td><Td>Commercial</Td><Td>1</Td><Td>—</Td><Td><Badge variant="gray">Not started</Badge></Td></Tr>
                </tbody>
              </Table>
              <div className="mt-4 flex gap-2">
                <Btn variant="primary"><Upload size={12} /> Upload Documents</Btn>
                <Btn><FileCheck size={12} /> Issue Receipt</Btn>
                <Btn>Save & Continue Later</Btn>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>All Onboarding Engagements</CardTitle></CardHeader>
          <Table>
            <thead><tr><Th>Client</Th><Th>Started</Th><Th>Properties</Th><Th>Progress</Th><Th>Status</Th></tr></thead>
            <tbody>
              {db.onboardings.map((ob) => (
                <Tr key={ob.id}>
                  <Td className="font-medium">{ob.clientName}</Td>
                  <Td>{ob.startedAt || "—"}</Td>
                  <Td>{ob.propertyCount}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(ob.currentStep / ob.totalSteps) * 100}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{ob.currentStep}/{ob.totalSteps}</span>
                    </div>
                  </Td>
                  <Td><Badge variant={statusVariant(ob.status)}>{ob.status.replace("_", " ")}</Badge></Td>
                  <Td><Btn>View</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
