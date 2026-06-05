"use client";
import { useState } from "react";
import { useWorkOrders, apiCall } from "@/hooks/useAPI";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, ProgressBar, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Plus, X, Loader2, Star } from "lucide-react";
import { db } from "@/lib/store";

function NewWOModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", priority: "normal", category: "general", estimatedCost: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Use first property as default for demo
    const { error } = await apiCall("/api/work-orders", "POST", {
      ...form,
      propertyId: "pr1", // In production: let user pick from dropdown
      estimatedCost: parseFloat(form.estimatedCost) || undefined,
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
          <h2 className="text-base font-semibold">New Work Order</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Issue *</label>
            <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. HVAC not cooling Unit 4B" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["emergency","high","normal","low"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["hvac","plumbing","electrical","structural","general"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Estimated cost ($)</label>
            <input type="number" value={form.estimatedCost} onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Btn onClick={onClose}>Cancel</Btn>
            <Btn variant="primary">{saving && <Loader2 size={12} className="animate-spin" />} Create WO</Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const { data, loading, mutate } = useWorkOrders();
  const [showModal, setShowModal] = useState(false);

  const workOrders = data?.workOrders ?? db.workOrders;
  const open = workOrders.filter((w: any) => w.status !== "complete").length;
  const inProgress = workOrders.filter((w: any) => w.status === "in_progress").length;
  const overdue = workOrders.filter((w: any) => w.status === "overdue").length;
  const spend = workOrders.reduce((s: number, w: any) => s + (w.estimatedCost ?? 0), 0);

  return (
    <>
      {showModal && <NewWOModal onClose={() => setShowModal(false)} onSaved={() => mutate()} />}
      <PageTopBar title="Maintenance & Capital Projects" subtitle="Work Orders · Vendors · Bids · Approvals">
        <Btn variant="primary" onClick={() => setShowModal(true)}><Plus size={13} /> New Work Order</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Open WOs" value={open} />
          <MetricCard label="In Progress" value={inProgress} />
          <MetricCard label="Overdue" value={overdue} valueColor={overdue > 0 ? "text-red-500" : undefined} />
          <MetricCard label="Spend MTD (Est.)" value={formatCurrency(spend)} />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Work Orders</CardTitle></CardHeader>
          {loading ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" size={20} /></div> : (
            <Table>
              <thead><tr><Th>WO #</Th><Th>Property</Th><Th>Issue</Th><Th>Priority</Th><Th>Vendor</Th><Th>Est. Cost</Th><Th>Status</Th><Th></Th></tr></thead>
              <tbody>
                {workOrders.map((wo: any) => (
                  <Tr key={wo.id}>
                    <Td className="font-mono text-xs">{wo.woNumber}</Td>
                    <Td>{wo.property?.name ?? wo.propertyAddress}</Td>
                    <Td className="font-medium max-w-[160px] truncate">{wo.title}</Td>
                    <Td><Badge variant={statusVariant(wo.priority)}>{wo.priority}</Badge></Td>
                    <Td>{wo.vendorName || "—"}</Td>
                    <Td>{wo.estimatedCost ? formatCurrency(wo.estimatedCost) : "—"}</Td>
                    <Td><Badge variant={statusVariant(wo.status)}>{wo.status.replace("_", " ")}</Badge></Td>
                    <Td><Btn>View</Btn></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>Capital Projects</CardTitle></CardHeader>
            <div className="space-y-4">
              {db.capitalProjects.map((cp) => {
                const pct = Math.round((cp.spent / cp.budget) * 100);
                return (
                  <div key={cp.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{cp.name}</span>
                      <span className="text-slate-500">{formatCurrency(cp.budget)}</span>
                    </div>
                    <ProgressBar value={pct} color={cp.status === "complete" ? "green" : pct > 80 ? "amber" : "blue"} />
                    <div className="text-xs text-slate-400 mt-0.5">{pct}% · {cp.status}</div>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <CardHeader><CardTitle>Approved Vendors</CardTitle></CardHeader>
            {db.vendors.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="text-xs text-slate-400 capitalize">{v.category}</div>
                </div>
                <div className="flex items-center gap-2">
                  {v.rating > 0 && <span className="text-xs text-slate-500 flex items-center gap-0.5"><Star size={10} className="fill-amber-400 text-amber-400" />{v.rating}</span>}
                  <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                </div>
              </div>
            ))}
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
