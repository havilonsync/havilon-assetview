"use client";
import { useMemo, useState } from "react";
import { apiCall, useAuditLog, useMfaStatus, useUsers } from "@/hooks/useAPI";
import { db } from "@/lib/store";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Loader2, ShieldAlert } from "lucide-react";

export default function SaaSPage() {
  const { data: usersData, loading: usersLoading, mutate: mutateUsers } = useUsers();
  const { data: logData, loading: logsLoading } = useAuditLog();
  const { data: mfaData, loading: mfaLoading, mutate: mutateMfa } = useMfaStatus();
  const users = usersData?.users ?? [];
  const logs = logData?.logs ?? [];
  const [notice, setNotice] = useState('');
  const [token, setToken] = useState('');
  const [setupData, setSetupData] = useState<{ manualEntryKey: string; otpauthUrl: string; issuer: string; accountName: string } | null>(null);
  const roleCounts = useMemo(() => users.reduce((acc: Record<string, number>, user: any) => {
    acc[user.role] = (acc[user.role] ?? 0) + 1;
    return acc;
  }, {}), [users]);
  const totalUsers = users.length;
  const mfaEnabledCount = users.filter((user: any) => user.mfaEnabled).length;

  async function startMfaSetup() {
    const response = await apiCall('/api/mfa', 'POST');
    if (response.error || !response.data) {
      setNotice(response.error ?? 'Failed to start MFA setup.');
      return;
    }
    setSetupData(response.data as any);
    setNotice('Scan the otpauth URI in your authenticator app or use the manual key below, then verify with a 6-digit code.');
    await mutateMfa();
  }

  async function verifyMfa(action: 'verify' | 'disable') {
    const response = await apiCall('/api/mfa', 'PATCH', { action, token });
    if (response.error) {
      setNotice(response.error);
      return;
    }
    setNotice(action === 'verify' ? 'MFA enabled.' : 'MFA disabled.');
    setToken('');
    if (action === 'disable') setSetupData(null);
    await Promise.all([mutateMfa(), mutateUsers()]);
  }

  return (
    <>
      <PageTopBar title="SaaS Administration" subtitle="Multi-company · User roles · MFA · Audit logging · Disaster recovery" />
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Companies" value={db.companies.length} />
          <MetricCard label="Total Users" value={totalUsers} />
          <MetricCard label="MFA Enabled" value={`${mfaEnabledCount}/${Math.max(totalUsers, 1)}`} />
          <MetricCard label="Uptime (30d)" value="99.97%" />
        </MetricsGrid>

        {notice && <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</div>}

        <Card>
          <CardHeader><CardTitle>Companies (Tenants)</CardTitle></CardHeader>
          <Table>
            <thead><tr><Th>Company</Th><Th>Plan</Th><Th>Users</Th><Th>Properties</Th><Th>Status</Th></tr></thead>
            <tbody>
              {db.companies.map((company) => (
                <Tr key={company.id}>
                  <Td className="font-medium">{company.name}</Td>
                  <Td><Badge variant={company.plan === 'enterprise' ? 'purple' : company.plan === 'pro' ? 'blue' : 'gray'}>{company.plan}</Badge></Td>
                  <Td>{company.userCount}</Td>
                  <Td>{company.propertyCount}</Td>
                  <Td><Badge variant={statusVariant(company.status)}>{company.status}</Badge></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>User Roles — Current Company</CardTitle></CardHeader>
            {usersLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : Object.entries(roleCounts).map(([role, count]) => (
              <FieldRow key={role} label={role} value={<span className="font-medium">{Number(count)} users</span>} />
            ))}
          </Card>

          <Card>
            <CardHeader><CardTitle>MFA Controls</CardTitle></CardHeader>
            {mfaLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : (
              <>
                <FieldRow label="MFA status" value={<Badge variant={mfaData?.mfaEnabled ? 'green' : 'amber'}>{mfaData?.mfaEnabled ? 'Enabled' : 'Not enabled'}</Badge>} />
                <FieldRow label="Pending setup" value={mfaData?.hasSecret ? 'Yes' : 'No'} />
                <div className="mt-3 flex gap-2">
                  <Btn variant="primary" onClick={startMfaSetup}>Generate Secret</Btn>
                  {mfaData?.mfaEnabled && <Btn onClick={() => verifyMfa('disable')}>Disable MFA</Btn>}
                </div>
                {setupData && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="font-medium">Authenticator setup</div>
                    <div className="mt-2 text-xs text-slate-500">Manual key</div>
                    <div className="font-mono text-xs break-all">{setupData.manualEntryKey}</div>
                    <div className="mt-2 text-xs text-slate-500">OTPAuth URI</div>
                    <div className="font-mono text-xs break-all">{setupData.otpauthUrl}</div>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter 6-digit code" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <Btn variant="primary" onClick={() => verifyMfa('verify')}>Verify</Btn>
                </div>
              </>
            )}
          </Card>
        </TwoCol>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-slate-500" />
              <CardTitle>Security Audit Log</CardTitle>
            </div>
          </CardHeader>
          {logsLoading ? <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div> : (
            <Table>
              <thead><tr><Th>Event</Th><Th>User</Th><Th>Entity</Th><Th>Timestamp</Th><Th>IP Address</Th></tr></thead>
              <tbody>
                {logs.map((log: any) => (
                  <Tr key={log.id}>
                    <Td className={String(log.action).includes('fail') ? 'font-medium text-red-600' : 'font-medium'}>{log.action}</Td>
                    <Td className="text-xs">{log.user?.email ?? log.user?.name ?? 'System'}</Td>
                    <Td>{log.entity}</Td>
                    <Td className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</Td>
                    <Td className="font-mono text-xs">{log.ipAddress || '—'}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </SectionPage>
    </>
  );
}
