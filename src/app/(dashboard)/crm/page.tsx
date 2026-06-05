"use client";
import { useState } from "react";
import { useLeads, apiCall } from "@/hooks/useAPI";
import { formatCurrency } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, Timeline, Avatar, Btn, FieldRow,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Plus, X, Loader2 } from "lucide-react";

const avatarColors = ["blue", "purple", "green", "amber", "blue"];
const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

function NewLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", stage: "new", source: "", pipelineValue: "", propertyCount: "1" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await apiCall("/api/leads", "POST", {
      ...form,
      pipelineValue: parseFloat(form.pipelineValue) || undefined,
      propertyCount: parseInt(form.propertyCount) || 1,
    });
    setSaving(false);
    if (error) { setError(error); return; }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold">New Lead</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {[
            { label: "Full name *", key: "name", type: "text", required: true },
            { label: "Email", key: "email", type: "email", required: false },
            { label: "Company", key: "company", type: "text", required: false },
            { label: "Pipeline value ($)", key: "pipelineValue", type: "number", required: false },
            { label: "Property count", key: "propertyCount", type: "number", required: false },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-slate-700 mb-1">{field.label}</label>
              <input type={field.type} required={field.required} value={(form as any)[field.key]}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Stage</label>
            <select value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {["new","proposal","negotiation","onboarding","closed_won"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary"><>{saving && <Loader2 size={12} className="animate-spin" />}Save Lead</></Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CRMPage() {
  const { data, loading, mutate } = useLeads();
  const [showModal, setShowModal] = useState(false);
  const leads = data?.leads ?? [];
  const proposals = data?.proposals ?? [];

  const totalPipeline = leads.reduce((s: number, l: any) => s + (l.pipelineValue ?? 0), 0);
  const proposalsSent = proposals.filter((p: any) => p.status === "sent").length;
  const signed = proposals.filter((p: any) => p.status === "accepted").length;

  return (
    <>
      {showModal && <NewLeadModal onClose={() => setShowModal(false)} onSaved={() => mutate()} />}
      <PageTopBar title="CRM" subtitle="Leads · Proposals · Contracts · Referrals">
        <Btn variant="primary" onClick={() => setShowModal(true)}><Plus size={13} /> New Lead</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Active Leads" value={leads.length} />
          <MetricCard label="Proposals Sent" value={proposalsSent} />
          <MetricCard label="Contracts Signed" value={signed} sub="This quarter" />
          <MetricCard label="Pipeline Value" value={formatCurrency(totalPipeline)} />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Lead Pipeline</CardTitle></CardHeader>
          {loading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" size={20} /></div> : (
            <Table>
              <thead><tr><Th>Contact</Th><Th>Company</Th><Th>Stage</Th><Th>Properties</Th><Th>Value</Th><Th></Th></tr></thead>
              <tbody>
                {leads.map((lead: any, i: number) => (
                  <Tr key={lead.id}>
                    <Td><div className="flex items-center gap-2"><Avatar initials={initials(lead.name)} color={avatarColors[i % avatarColors.length]} /><span className="font-medium">{lead.name}</span></div></Td>
                    <Td>{lead.company || "—"}</Td>
                    <Td><Badge variant={statusVariant(lead.stage)}>{lead.stage}</Badge></Td>
                    <Td>{lead.propertyCount}</Td>
                    <Td>{lead.pipelineValue ? formatCurrency(lead.pipelineValue) : "—"}</Td>
                    <Td><Btn>View</Btn></Td>
                  </Tr>
                ))}
                {leads.length === 0 && <Tr><Td className="text-center text-slate-400 py-6" >No leads yet — create your first one</Td></Tr>}
              </tbody>
            </Table>
          )}
        </Card>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>Referral Sources</CardTitle></CardHeader>
            {[{ label: "Past clients", pct: "41%" }, { label: "Agent referrals", pct: "28%" }, { label: "Website / SEO", pct: "19%" }, { label: "LinkedIn", pct: "8%" }, { label: "Other", pct: "4%" }].map((r) => (
              <FieldRow key={r.label} label={r.label} value={r.pct} />
            ))}
          </Card>
          <Card>
            <CardHeader><CardTitle>Recent Proposals</CardTitle></CardHeader>
            <Timeline items={[
              { text: "Proposal #P-0044 sent to L. Kim", sub: "May 28 · 7 units · $2.1M AUM", color: "blue" },
              { text: "Contract #C-0031 signed — R. Thornton", sub: "May 22 · 3 units · $1.2M AUM", color: "green" },
              { text: "Proposal #P-0043 counter by M. Flores", sub: "May 19 · Awaiting response", color: "amber" },
            ]} />
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
