"use client";
import { useEffect, useMemo, useState } from "react";
import { apiCall, useAssets, useLifecycleEvents } from "@/hooks/useAPI";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Timeline, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Loader2, Plus, X } from "lucide-react";

function AddAssetModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    assetCode: "",
    name: "",
    type: "multi_family",
    address: "",
    city: "",
    state: "TX",
    zip: "",
    purchasePrice: "",
    currentValue: "",
    ownerName: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await apiCall("/api/assets", "POST", {
      ...form,
      purchasePrice: form.purchasePrice ? Number.parseFloat(form.purchasePrice) : undefined,
      currentValue: form.currentValue ? Number.parseFloat(form.currentValue) : undefined,
    });
    setSaving(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Add Asset</h2>
          <button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Asset code" value={form.assetCode} onChange={(e) => setForm((c) => ({ ...c, assetCode: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input required placeholder="Asset name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {['residential','commercial','multi_family','single_family'].map((type) => <option key={type} value={type}>{type.replace('_', ' ')}</option>)}
            </select>
            <input placeholder="Owner name" value={form.ownerName} onChange={(e) => setForm((c) => ({ ...c, ownerName: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <input required placeholder="Street address" value={form.address} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="grid grid-cols-3 gap-3">
            <input required placeholder="City" value={form.city} onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input required placeholder="State" value={form.state} onChange={(e) => setForm((c) => ({ ...c, state: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input required placeholder="ZIP" value={form.zip} onChange={(e) => setForm((c) => ({ ...c, zip: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Purchase price" value={form.purchasePrice} onChange={(e) => setForm((c) => ({ ...c, purchasePrice: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="number" placeholder="Current value" value={form.currentValue} onChange={(e) => setForm((c) => ({ ...c, currentValue: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">{saving && <Loader2 size={12} className="mr-1 inline animate-spin" />}Save Asset</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddLifecycleEventModal({ assetId, onClose, onSaved }: { assetId: string; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ eventType: 'inspection', title: '', description: '', amount: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await apiCall('/api/assets/lifecycle', 'POST', {
      assetId,
      eventType: form.eventType,
      title: form.title,
      description: form.description || undefined,
      amount: form.amount ? Number.parseFloat(form.amount) : undefined,
    });
    setSaving(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    const receiptNumber = (response.data as { receipt?: { receiptNumber?: string } }).receipt?.receiptNumber;
    onSaved(receiptNumber ? `Lifecycle event recorded. Receipt ${receiptNumber} issued.` : 'Lifecycle event recorded.');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Add Lifecycle Event</h2>
          <button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <select value={form.eventType} onChange={(e) => setForm((c) => ({ ...c, eventType: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {['acquisition','lease','maintenance','inspection','insurance','legal','disposal'].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <input required placeholder="Title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} />
          <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cancel</button>
            <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">{saving && <Loader2 size={12} className="mr-1 inline animate-spin" />}Save Event</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AssetsPage() {
  const { data, loading, mutate } = useAssets();
  const assets = data?.assets ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [notice, setNotice] = useState('');
  const { data: lifecycleData, loading: lifecycleLoading, mutate: mutateLifecycle } = useLifecycleEvents(selectedId);

  useEffect(() => {
    if (!selectedId && assets.length > 0) setSelectedId(assets[0].id);
  }, [assets, selectedId]);

  const selectedAsset = useMemo(() => assets.find((asset: any) => asset.id === selectedId) ?? assets[0], [assets, selectedId]);
  const events = lifecycleData?.events ?? selectedAsset?.lifecycleEvents ?? [];
  const totalValue = assets.reduce((sum: number, asset: any) => sum + Number(asset.currentValue ?? 0), 0);
  const totalEvents = assets.reduce((sum: number, asset: any) => sum + (asset.lifecycleEvents?.length ?? 0), 0);
  const dispositions = assets.filter((asset: any) => asset.status === 'disposed').length;

  return (
    <>
      {showAssetModal && <AddAssetModal onClose={() => setShowAssetModal(false)} onSaved={() => mutate()} />}
      {showEventModal && selectedAsset && (
        <AddLifecycleEventModal
          assetId={selectedAsset.id}
          onClose={() => setShowEventModal(false)}
          onSaved={async (message) => {
            setNotice(message);
            await Promise.all([mutate(), mutateLifecycle()]);
          }}
        />
      )}
      <PageTopBar title="Asset Lifecycle Records" subtitle="Full history · Every asset, every event">
        <Btn variant="primary" onClick={() => setShowAssetModal(true)}><Plus size={13} /> Add Asset</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Total Assets" value={assets.length} />
          <MetricCard label="Lifecycle Events" value={totalEvents} />
          <MetricCard label="Portfolio Value" value={formatCurrency(totalValue)} />
          <MetricCard label="Dispositions" value={dispositions} />
        </MetricsGrid>

        {notice && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}

        <Card>
          <CardHeader>
            <CardTitle>All Assets</CardTitle>
            {selectedAsset ? <Btn variant="primary" onClick={() => setShowEventModal(true)}>Add Lifecycle Event</Btn> : <div />}
          </CardHeader>
          {loading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : (
            <Table>
              <thead>
                <tr>
                  <Th>Code</Th><Th>Address</Th><Th>Type</Th><Th>Owner</Th><Th>Properties</Th><Th>Purchase Price</Th><Th>Current Value</Th><Th>Status</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset: any) => (
                  <Tr key={asset.id}>
                    <Td className="font-mono text-xs">{asset.assetCode}</Td>
                    <Td className="font-medium">{asset.address}</Td>
                    <Td><span className="capitalize">{String(asset.type).replace('_', ' ')}</span></Td>
                    <Td>{asset.ownerName || '—'}</Td>
                    <Td>{asset.properties?.length ?? 0}</Td>
                    <Td>{formatCurrency(asset.purchasePrice)}</Td>
                    <Td>{formatCurrency(asset.currentValue)}</Td>
                    <Td><Badge variant={statusVariant(asset.status)}>{asset.status}</Badge></Td>
                    <Td><Btn onClick={() => setSelectedId(asset.id)}>View</Btn></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {selectedAsset && (
          <TwoCol>
            <Card>
              <CardHeader>
                <CardTitle>{selectedAsset.name} — Asset Record</CardTitle>
                <Badge variant={statusVariant(selectedAsset.status)}>{selectedAsset.status}</Badge>
              </CardHeader>
              <FieldRow label="Asset ID" value={<span className="font-mono text-xs">{selectedAsset.assetCode}</span>} />
              <FieldRow label="Type" value={<span className="capitalize">{String(selectedAsset.type).replace('_', ' ')}</span>} />
              <FieldRow label="Acquired" value={formatDateShort(selectedAsset.acquiredAt)} />
              <FieldRow label="Purchase Price" value={formatCurrency(selectedAsset.purchasePrice)} />
              <FieldRow label="Current Value" value={formatCurrency(selectedAsset.currentValue)} />
              <FieldRow label="Owner" value={selectedAsset.ownerName || '—'} />
              <FieldRow label="Properties" value={selectedAsset.properties?.length ?? 0} />
              <FieldRow label="Total Units" value={selectedAsset.properties?.reduce((sum: number, property: any) => sum + Number(property.totalUnits ?? 0), 0) ?? 0} />
              <FieldRow label="Liens" value={selectedAsset.lienStatus} />
              <FieldRow label="Legal Holds" value={selectedAsset.legalHolds ? <Badge variant="red">Active</Badge> : 'None'} />
            </Card>

            <Card>
              <CardHeader><CardTitle>Lifecycle Timeline — {selectedAsset.name}</CardTitle></CardHeader>
              {lifecycleLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : (
                <Timeline items={events.map((event: any) => ({
                  text: event.title,
                  sub: `${formatDateShort(event.occurredAt)}${event.amount ? ` · ${formatCurrency(event.amount)}` : ''}${event.receiptId ? ` · Receipt ${event.receiptId.slice(0, 8)}` : ''}`,
                  color: event.eventType === 'disposal' ? 'red' : event.eventType === 'insurance' ? 'amber' : 'blue',
                }))} />
              )}
            </Card>
          </TwoCol>
        )}
      </SectionPage>
    </>
  );
}
