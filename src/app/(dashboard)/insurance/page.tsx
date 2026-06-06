"use client";
import { useEffect, useMemo, useState } from "react";
import { apiCall, useInsuranceClaims, useInsurancePolicies } from "@/hooks/useAPI";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Loader2, Plus, ShieldPlus, X } from "lucide-react";

function AddPolicyModal({ onClose, onSaved }: { onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState({ carrier: '', policyNumber: '', type: 'property', coverageAmount: '', premium: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await apiCall('/api/insurance-policies', 'POST', {
      ...form,
      coverageAmount: form.coverageAmount ? Number.parseFloat(form.coverageAmount) : undefined,
      premium: form.premium ? Number.parseFloat(form.premium) : undefined,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
    });
    setSaving(false);
    if (response.error) {
      setError(response.error);
      return;
    }
    const receiptNumber = (response.data as { receipt?: { receiptNumber?: string } }).receipt?.receiptNumber;
    onSaved(receiptNumber ? `Policy saved. Receipt ${receiptNumber} issued.` : 'Policy saved.');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">Add Insurance Policy</h2><button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button></div>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Carrier" value={form.carrier} onChange={(e) => setForm((c) => ({ ...c, carrier: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input required placeholder="Policy number" value={form.policyNumber} onChange={(e) => setForm((c) => ({ ...c, policyNumber: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {['property','liability','umbrella'].map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Coverage amount" value={form.coverageAmount} onChange={(e) => setForm((c) => ({ ...c, coverageAmount: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="number" placeholder="Premium" value={form.premium} onChange={(e) => setForm((c) => ({ ...c, premium: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input required type="date" value={form.startDate} onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input required type="date" value={form.endDate} onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">{saving && <Loader2 size={12} className="mr-1 inline animate-spin" />}Save</button></div>
        </form>
      </div>
    </div>
  );
}

function FileClaimModal({ policies, onClose, onSaved }: { policies: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ policyId: policies[0]?.id ?? '', incidentDate: '', description: '', claimAmount: '', adjusterName: '', adjusterEmail: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!form.policyId && policies[0]?.id) setForm((current) => ({ ...current, policyId: policies[0].id }));
  }, [form.policyId, policies]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await apiCall('/api/insurance-claims', 'POST', {
      ...form,
      incidentDate: new Date(form.incidentDate).toISOString(),
      claimAmount: form.claimAmount ? Number.parseFloat(form.claimAmount) : undefined,
      adjusterName: form.adjusterName || undefined,
      adjusterEmail: form.adjusterEmail || undefined,
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-base font-semibold">File Claim</h2><button type="button" onClick={onClose}><X size={18} className="text-slate-400" /></button></div>
        <form onSubmit={submit} className="space-y-3">
          <select value={form.policyId} onChange={(e) => setForm((c) => ({ ...c, policyId: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {policies.map((policy) => <option key={policy.id} value={policy.id}>{policy.policyNumber} · {policy.carrier}</option>)}
          </select>
          <input required type="date" value={form.incidentDate} onChange={(e) => setForm((c) => ({ ...c, incidentDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea required placeholder="Description" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="number" placeholder="Claim amount" value={form.claimAmount} onChange={(e) => setForm((c) => ({ ...c, claimAmount: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input placeholder="Adjuster name" value={form.adjusterName} onChange={(e) => setForm((c) => ({ ...c, adjusterName: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="email" placeholder="Adjuster email" value={form.adjusterEmail} onChange={(e) => setForm((c) => ({ ...c, adjusterEmail: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cancel</button><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white">{saving && <Loader2 size={12} className="mr-1 inline animate-spin" />}Submit</button></div>
        </form>
      </div>
    </div>
  );
}

export default function InsurancePage() {
  const { data: policyData, loading: policiesLoading, mutate: mutatePolicies } = useInsurancePolicies();
  const { data: claimsData, loading: claimsLoading, mutate: mutateClaims } = useInsuranceClaims();
  const policies = policyData?.policies ?? [];
  const claims = claimsData?.claims ?? [];
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!selectedClaimId && claims.length > 0) setSelectedClaimId(claims[0].id);
  }, [claims, selectedClaimId]);

  const detail = useMemo(() => claims.find((claim: any) => claim.id === selectedClaimId) ?? claims[0], [claims, selectedClaimId]);
  const totalCoverage = policies.reduce((sum: number, policy: any) => sum + Number(policy.coverageAmount ?? 0), 0);
  const openClaims = claims.filter((claim: any) => !['approved', 'denied'].includes(claim.status)).length;
  const renewalsDue = policies.filter((policy: any) => {
    const endDate = new Date(policy.endDate).getTime();
    return endDate >= Date.now() && endDate <= Date.now() + 60 * 86400000;
  }).length;

  return (
    <>
      {showPolicyModal && <AddPolicyModal onClose={() => setShowPolicyModal(false)} onSaved={async (message) => { setNotice(message); await mutatePolicies(); }} />}
      {showClaimModal && <FileClaimModal policies={policies} onClose={() => setShowClaimModal(false)} onSaved={async () => { setNotice('Claim filed.'); await Promise.all([mutateClaims(), mutatePolicies()]); }} />}
      <PageTopBar title="Insurance Coordination" subtitle="Policies · Claims · Renewals · Documentation">
        <Btn onClick={() => setShowPolicyModal(true)}><ShieldPlus size={13} /> Add Policy</Btn>
        <Btn variant="primary" onClick={() => setShowClaimModal(true)}><Plus size={13} /> File Claim</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Active Policies" value={policies.length} />
          <MetricCard label="Open Claims" value={openClaims} />
          <MetricCard label="Renewals Due (60d)" value={renewalsDue} />
          <MetricCard label="Total Coverage" value={formatCurrency(totalCoverage)} />
        </MetricsGrid>

        {notice && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}

        <Card>
          <CardHeader><CardTitle>Active Claims</CardTitle></CardHeader>
          {claimsLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : (
            <Table>
              <thead>
                <tr><Th>Claim #</Th><Th>Policy</Th><Th>Incident</Th><Th>Filed</Th><Th>Amount</Th><Th>Status</Th><Th></Th></tr>
              </thead>
              <tbody>
                {claims.map((claim: any) => (
                  <Tr key={claim.id}>
                    <Td className="font-mono text-xs">{claim.claimNumber}</Td>
                    <Td>{claim.policy?.policyNumber || claim.policy?.carrier || '—'}</Td>
                    <Td>{claim.description}</Td>
                    <Td>{formatDateShort(claim.incidentDate)}</Td>
                    <Td>{claim.claimAmount ? formatCurrency(claim.claimAmount) : 'TBD'}</Td>
                    <Td><Badge variant={statusVariant(claim.status)}>{claim.status.replace(/_/g, ' ')}</Badge></Td>
                    <Td><Btn onClick={() => setSelectedClaimId(claim.id)}>View</Btn></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>Policy Renewals</CardTitle></CardHeader>
            {policiesLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : (
              <Table>
                <thead><tr><Th>Policy</Th><Th>Carrier</Th><Th>Renews</Th><Th>Premium</Th><Th>Status</Th></tr></thead>
                <tbody>
                  {policies.map((policy: any) => (
                    <Tr key={policy.id}>
                      <Td className="font-mono text-xs">#{policy.policyNumber}</Td>
                      <Td>{policy.carrier}</Td>
                      <Td>{formatDateShort(policy.endDate)}</Td>
                      <Td>{formatCurrency(policy.premium)}/yr</Td>
                      <Td><Badge variant={statusVariant(policy.status)}>{policy.status}</Badge></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{detail ? `Claim #${detail.claimNumber} Detail` : 'Select a claim'}</CardTitle>
              {detail && <Badge variant={statusVariant(detail.status)}>{detail.status.replace(/_/g, ' ')}</Badge>}
            </CardHeader>
            {detail ? (
              <>
                <FieldRow label="Incident date" value={formatDateShort(detail.incidentDate)} />
                <FieldRow label="Filed" value={formatDateShort(detail.filedDate)} />
                <FieldRow label="Adjuster" value={detail.adjusterName || 'Unassigned'} />
                <FieldRow label="Approved" value={detail.approvedAmount ? formatCurrency(detail.approvedAmount) : 'Pending'} />
                <FieldRow label="Policy" value={detail.policy ? `${detail.policy.carrier} · ${detail.policy.policyNumber}` : '—'} />
                <FieldRow label="Documents" value={<Badge variant="blue">{detail.documents?.length ?? 0} files</Badge>} />
              </>
            ) : <div className="py-8 text-center text-sm text-slate-400">No claims filed yet.</div>}
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
