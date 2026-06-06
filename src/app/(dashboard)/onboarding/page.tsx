"use client";
import { useEffect, useMemo, useState } from "react";
import { apiCall, useOnboardings, useOnboardingSteps } from "@/hooks/useAPI";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar, SectionPage,
  Table, Th, Td, Tr, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Loader2, Plus, Upload, FileCheck, X } from "lucide-react";

const DEFAULT_STEP_NAMES = ["Agreement", "KYC / ID", "Asset Import", "Lease Upload", "Financials", "Insurance", "Go Live"];
const documentTypes = ["deed", "lease", "insurance", "inspection", "legal", "correspondence", "financial"];

function StepIndicator({ steps }: { steps: Array<{ id: string; stepNumber: number; name: string; status: string }> }) {
  const current = steps.find((step) => step.status !== "complete")?.stepNumber ?? steps.length;

  return (
    <div className="flex gap-1 my-4 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const done = step.status === "complete";
        const active = step.stepNumber === current && !done;
        return (
          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  done ? "bg-blue-600 text-white" : active ? "bg-blue-600 text-white ring-2 ring-blue-200" : "bg-slate-100 text-slate-400"
                }`}
              >
                {done ? "✓" : step.stepNumber}
              </div>
              <div className={`text-[10px] mt-1 whitespace-nowrap ${active ? "font-semibold text-slate-800" : "text-slate-400"}`}>
                {step.name || DEFAULT_STEP_NAMES[index] || `Step ${step.stepNumber}`}
              </div>
            </div>
            {index < steps.length - 1 && <div className={`w-6 h-px mt-[-14px] ${done ? "bg-blue-400" : "bg-slate-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function StartOnboardingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ clientName: "", clientEmail: "", totalSteps: "7" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { error: requestError } = await apiCall("/api/onboarding", "POST", {
      clientName: form.clientName,
      clientEmail: form.clientEmail || undefined,
      totalSteps: Number.parseInt(form.totalSteps, 10) || 7,
    });
    setSaving(false);
    if (requestError) {
      setError(requestError);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Start Onboarding</h2>
          <button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Client name *</label>
            <input
              required
              value={form.clientName}
              onChange={(e) => setForm((current) => ({ ...current, clientName: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Client email</label>
            <input
              type="email"
              value={form.clientEmail}
              onChange={(e) => setForm((current) => ({ ...current, clientEmail: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Step count</label>
            <input
              type="number"
              min={1}
              max={20}
              value={form.totalSteps}
              onChange={(e) => setForm((current) => ({ ...current, totalSteps: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
              {saving && <Loader2 size={12} className="mr-1 inline animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UploadDocumentModal({ onboardingId, onClose, onSaved }: { onboardingId: string; onClose: () => void; onSaved: (message: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("financial");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function sha256Hex(selectedFile: File) {
    const buffer = await selectedFile.arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Select a file to upload.");
      return;
    }

    setSaving(true);
    setError("");
    const init = await apiCall("/api/upload", "POST", {
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      documentType,
      onboardingId,
    });

    if (init.error || !init.data) {
      setSaving(false);
      setError(init.error ?? "Failed to initialize upload.");
      return;
    }

    const payload = init.data as { documentId: string; uploadUrl: string };
    const uploadResponse = await fetch(payload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });

    if (!uploadResponse.ok) {
      setSaving(false);
      setError(`Upload failed: ${uploadResponse.status}`);
      return;
    }

    const hash = await sha256Hex(file);
    const finalize = await apiCall("/api/upload", "PATCH", { documentId: payload.documentId, hash });
    setSaving(false);
    if (finalize.error || !finalize.data) {
      setError(finalize.error ?? "Failed to finalize upload.");
      return;
    }

    const receiptNumber = (finalize.data as { receipt?: { receiptNumber?: string } }).receipt?.receiptNumber;
    onSaved(receiptNumber ? `Upload complete. Receipt ${receiptNumber} issued.` : "Upload complete.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Upload Onboarding Document</h2>
          <button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Document type</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">File</label>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">
              {saving && <Loader2 size={12} className="mr-1 inline animate-spin" />}
              Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { data, loading, mutate } = useOnboardings();
  const onboardings = data?.onboardings ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [notice, setNotice] = useState("");
  const { data: stepsData, loading: stepsLoading, mutate: mutateSteps } = useOnboardingSteps(selectedId);

  useEffect(() => {
    if (!selectedId && onboardings.length > 0) {
      setSelectedId(onboardings[0].id);
    }
  }, [onboardings, selectedId]);

  const selectedOnboarding = useMemo(
    () => onboardings.find((item: any) => item.id === selectedId) ?? onboardings.find((item: any) => item.status === "in_progress") ?? onboardings[0],
    [onboardings, selectedId]
  );
  const steps = stepsData?.steps ?? selectedOnboarding?.steps ?? [];
  const inProgressCount = onboardings.filter((item: any) => item.status === "in_progress").length;
  const completeCount = onboardings.filter((item: any) => item.status === "complete").length;
  const documentCount = onboardings.reduce((sum: number, item: any) => sum + (item.documents?.length ?? 0), 0);

  async function updateStep(stepId: string, status: string) {
    const response = await apiCall("/api/onboarding/steps", "PATCH", { stepId, status });
    if (!response.error) {
      setNotice(`Step updated to ${status.replace("_", " ")}.`);
      await Promise.all([mutate(), mutateSteps()]);
    } else {
      setNotice(response.error);
    }
  }

  async function issueReceipt() {
    if (!selectedOnboarding) return;
    const response = await apiCall("/api/receipts-generate", "POST", {
      type: "action",
      issuedTo: selectedOnboarding.clientEmail || selectedOnboarding.clientName,
      eventType: "Onboarding checkpoint",
      eventDescription: `${selectedOnboarding.clientName} onboarding checkpoint recorded`,
      entityType: "Onboarding",
      entityId: selectedOnboarding.id,
      deliveredVia: "portal",
    });
    if (response.error) {
      setNotice(response.error);
      return;
    }
    const receiptNumber = (response.data as { receipt?: { receiptNumber?: string } }).receipt?.receiptNumber;
    setNotice(receiptNumber ? `Receipt ${receiptNumber} issued.` : "Receipt issued.");
  }

  return (
    <>
      {showCreate && <StartOnboardingModal onClose={() => setShowCreate(false)} onSaved={() => mutate()} />}
      {showUpload && selectedOnboarding && (
        <UploadDocumentModal
          onboardingId={selectedOnboarding.id}
          onClose={() => setShowUpload(false)}
          onSaved={async (message) => {
            setNotice(message);
            await mutate();
          }}
        />
      )}
      <PageTopBar title="Client Onboarding" subtitle="Historical imports · Document collection · 7-step wizard">
        <Btn variant="primary" onClick={() => setShowCreate(true)}><Plus size={13} /> Start Onboarding</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Engagements" value={onboardings.length} />
          <MetricCard label="In Progress" value={inProgressCount} />
          <MetricCard label="Completed" value={completeCount} />
          <MetricCard label="Documents Uploaded" value={documentCount} />
        </MetricsGrid>

        {notice && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}

        <Card>
          <CardHeader>
            <CardTitle>{selectedOnboarding ? `${selectedOnboarding.clientName} — Onboarding` : "Select an onboarding record"}</CardTitle>
            {selectedOnboarding && <Badge variant={statusVariant(selectedOnboarding.status)}>{selectedOnboarding.status.replace("_", " ")}</Badge>}
          </CardHeader>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : selectedOnboarding ? (
            <>
              <StepIndicator steps={steps} />
              <div className="mt-4">
                <div className="mb-3 text-sm font-semibold">Current workflow</div>
                {stepsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
                ) : (
                  <Table>
                    <thead><tr><Th>Step</Th><Th>Name</Th><Th>Status</Th><Th>Completed</Th><Th>Notes</Th><Th></Th></tr></thead>
                    <tbody>
                      {steps.map((step: any) => (
                        <Tr key={step.id}>
                          <Td>{step.stepNumber}</Td>
                          <Td className="font-medium">{step.name}</Td>
                          <Td><Badge variant={statusVariant(step.status)}>{step.status.replace("_", " ")}</Badge></Td>
                          <Td>{step.completedAt ? new Date(step.completedAt).toLocaleDateString() : "—"}</Td>
                          <Td className="max-w-[220px] truncate text-slate-500">{step.notes || "—"}</Td>
                          <Td>
                            <div className="flex gap-2">
                              {step.status !== "in_progress" && <Btn onClick={() => updateStep(step.id, "in_progress")}>Start</Btn>}
                              {step.status !== "complete" && <Btn variant="primary" onClick={() => updateStep(step.id, "complete")}>Complete</Btn>}
                            </div>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                )}
                <div className="mt-4 flex gap-2">
                  <Btn variant="primary" onClick={() => setShowUpload(true)}><Upload size={12} /> Upload Documents</Btn>
                  <Btn onClick={issueReceipt}><FileCheck size={12} /> Issue Receipt</Btn>
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">No onboarding engagements found.</div>
          )}
        </Card>

        <Card>
          <CardHeader><CardTitle>All Onboarding Engagements</CardTitle></CardHeader>
          <Table>
            <thead><tr><Th>Client</Th><Th>Started</Th><Th>Documents</Th><Th>Progress</Th><Th>Status</Th><Th></Th></tr></thead>
            <tbody>
              {onboardings.map((item: any) => (
                <Tr key={item.id}>
                  <Td className="font-medium">{item.clientName}</Td>
                  <Td>{item.startedAt ? new Date(item.startedAt).toLocaleDateString() : "—"}</Td>
                  <Td>{item.documents?.length ?? 0}</Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.min(100, Math.round(((item.currentStep ?? 0) / Math.max(item.totalSteps ?? 1, 1)) * 100))}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{item.currentStep}/{item.totalSteps}</span>
                    </div>
                  </Td>
                  <Td><Badge variant={statusVariant(item.status)}>{item.status.replace("_", " ")}</Badge></Td>
                  <Td><Btn onClick={() => setSelectedId(item.id)}>View</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </SectionPage>
    </>
  );
}
