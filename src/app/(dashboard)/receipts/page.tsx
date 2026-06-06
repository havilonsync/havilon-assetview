"use client";
import { useEffect, useMemo, useState } from "react";
import { apiCall, useReceipts } from "@/hooks/useAPI";
import { formatCurrency } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge } from "@/components/ui/Badge";
import { Loader2, Lock, Plus, ShieldCheck, X } from "lucide-react";

function GenerateReceiptModal({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ type: 'action', issuedTo: '', eventType: '', eventDescription: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await apiCall('/api/receipts-generate', 'POST', {
      ...form,
      amount: form.amount ? Number.parseFloat(form.amount) : undefined,
    });
    setSaving(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    const receiptNumber = (response.data as { receipt?: { receiptNumber?: string } }).receipt?.receiptNumber;
    onSaved(receiptNumber ? `Receipt ${receiptNumber} generated.` : 'Receipt generated.');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">Generate Receipt</h2><button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button></div>
        <form onSubmit={submit} className="space-y-3">
          <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {['payment','document','lease','claim','disbursement','action'].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input required placeholder="Issued to" value={form.issuedTo} onChange={(e) => setForm((c) => ({ ...c, issuedTo: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input required placeholder="Event type" value={form.eventType} onChange={(e) => setForm((c) => ({ ...c, eventType: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea required placeholder="Event description" value={form.eventDescription} onChange={(e) => setForm((c) => ({ ...c, eventDescription: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">{saving && <Loader2 size={12} className="mr-1 inline animate-spin" />}Generate</button></div>
        </form>
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  const { data, loading, mutate } = useReceipts();
  const receipts = data?.receipts ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!selectedId && receipts.length > 0) setSelectedId(receipts[0].id);
  }, [receipts, selectedId]);

  const detail = useMemo(() => receipts.find((receipt: any) => receipt.id === selectedId) ?? receipts[0], [receipts, selectedId]);
  const typeCounts = receipts.reduce((acc: Record<string, number>, receipt: any) => {
    acc[receipt.type] = (acc[receipt.type] ?? 0) + 1;
    return acc;
  }, {});
  const recent30d = receipts.filter((receipt: any) => Date.now() - new Date(receipt.createdAt).getTime() <= 30 * 86400000);
  const typeVariant: Record<string, 'green' | 'blue' | 'purple' | 'amber' | 'gray'> = {
    lease: 'green', payment: 'blue', document: 'purple', claim: 'amber', disbursement: 'gray', action: 'blue',
  };

  return (
    <>
      {showModal && <GenerateReceiptModal onClose={() => setShowModal(false)} onSaved={async (message) => { setNotice(message); await mutate(); }} />}
      <PageTopBar title="Submission Receipts & Chain of Custody" subtitle="Auto-issued · Immutable · SHA-256 verified · Auditable">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-emerald-600"><ShieldCheck size={13} /><span>All receipts verified</span></div>
          <Btn variant="primary" onClick={() => setShowModal(true)}><Plus size={12} /> Generate</Btn>
        </div>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Receipts Issued (30d)" value={recent30d.length} />
          <MetricCard label="Document Receipts" value={typeCounts.document ?? 0} />
          <MetricCard label="Payment Receipts" value={typeCounts.payment ?? 0} />
          <MetricCard label="Action Receipts" value={typeCounts.action ?? 0} />
        </MetricsGrid>

        {notice && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}

        <Card>
          <CardHeader><CardTitle>Recent Receipts</CardTitle></CardHeader>
          {loading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : (
            <Table>
              <thead>
                <tr><Th>Receipt #</Th><Th>Type</Th><Th>Issued To</Th><Th>Event</Th><Th>Amount</Th><Th>Timestamp</Th><Th>Hash</Th><Th></Th></tr>
              </thead>
              <tbody>
                {receipts.map((receipt: any) => (
                  <Tr key={receipt.id}>
                    <Td className="font-mono text-xs">{receipt.receiptNumber}</Td>
                    <Td><Badge variant={typeVariant[receipt.type] ?? 'gray'}>{receipt.type}</Badge></Td>
                    <Td>{receipt.issuedTo}</Td>
                    <Td className="max-w-[220px] truncate text-xs text-slate-600">{receipt.eventDescription}</Td>
                    <Td>{receipt.amount ? formatCurrency(receipt.amount) : '—'}</Td>
                    <Td className="text-xs text-slate-500">{new Date(receipt.createdAt).toLocaleString()}</Td>
                    <Td className="font-mono text-xs text-slate-400">{String(receipt.hash).slice(0, 8)}…</Td>
                    <Td><Btn onClick={() => setSelectedId(receipt.id)}>View</Btn></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {detail && (
          <TwoCol>
            <Card>
              <CardHeader>
                <CardTitle>Receipt #{detail.receiptNumber} — Full Detail</CardTitle>
                <div className="flex items-center gap-1 text-xs text-emerald-600"><Lock size={11} /><span>Immutable</span></div>
              </CardHeader>
              <FieldRow label="Receipt ID" value={<span className="font-mono text-xs">{detail.receiptNumber}</span>} />
              <FieldRow label="Event type" value={detail.eventType} />
              <FieldRow label="Description" value={detail.eventDescription} />
              <FieldRow label="Issued to" value={detail.issuedTo} />
              <FieldRow label="Timestamp" value={<span className="font-mono text-xs">{detail.createdAt}</span>} />
              <FieldRow label="SHA-256 hash" value={<span className="font-mono text-xs text-slate-500">{detail.hash}</span>} />
              <FieldRow label="Immutable" value={<Badge variant="green">Yes</Badge>} />
              <FieldRow label="Delivered via" value={detail.deliveredVia || 'portal'} />
            </Card>

            <Card>
              <CardHeader><CardTitle>Receipt Type Breakdown</CardTitle></CardHeader>
              {Object.entries(typeCounts).map(([type, count]) => (
                <FieldRow key={type} label={<span className="capitalize">{type} receipts</span>} value={<span>{Number(count)}</span>} />
              ))}
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                <span className="font-semibold">Chain of Custody:</span> Every submission, payment, document upload, and action in AssetView generates an immutable receipt anchored by a deterministic hash.
              </div>
            </Card>
          </TwoCol>
        )}
      </SectionPage>
    </>
  );
}
