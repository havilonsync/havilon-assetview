import { db } from "@/lib/store";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { ShieldAlert } from "lucide-react";

const roles = [
  { role: "Admin", count: 2 },
  { role: "Manager", count: 4 },
  { role: "Owner (portal)", count: 48 },
  { role: "Auditor (read-only)", count: 2 },
  { role: "Vendor (limited)", count: 8 },
  { role: "Tenant (portal)", count: 118 },
];

export default function SaaSPage() {
  const totalUsers = roles.reduce((s, r) => s + r.count, 0);
  return (
    <>
      <PageTopBar title="SaaS Administration" subtitle="Multi-company · User roles · MFA · Audit logging · Disaster recovery" />
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Companies" value={db.companies.length} />
          <MetricCard label="Total Users" value={totalUsers} />
          <MetricCard label="MFA Enabled" value="100%" />
          <MetricCard label="Uptime (30d)" value="99.97%" />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Companies (Tenants)</CardTitle></CardHeader>
          <Table>
            <thead>
              <tr><Th>Company</Th><Th>Plan</Th><Th>Users</Th><Th>Properties</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {db.companies.map((co) => (
                <Tr key={co.id}>
                  <Td className="font-medium">{co.name}</Td>
                  <Td>
                    <Badge variant={co.plan === "enterprise" ? "purple" : co.plan === "pro" ? "blue" : "gray"}>
                      {co.plan}
                    </Badge>
                  </Td>
                  <Td>{co.userCount}</Td>
                  <Td>{co.propertyCount}</Td>
                  <Td><Badge variant={statusVariant(co.status)}>{co.status}</Badge></Td>
                  <Td><Btn>Manage</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>User Roles — Havilon Realty</CardTitle></CardHeader>
            {roles.map((r) => (
              <FieldRow key={r.role} label={r.role} value={<span className="font-medium">{r.count} users</span>} />
            ))}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & System Status</CardTitle>
            </CardHeader>
            <FieldRow label="MFA enforcement" value={<Badge variant="green">Required for all</Badge>} />
            <FieldRow label="Session timeout" value="8 hours" />
            <FieldRow label="IP allowlisting" value={<Badge variant="green">Enabled</Badge>} />
            <FieldRow label="Data encryption" value="AES-256 at rest" />
            <FieldRow label="Backups" value="Daily · 30-day retention" />
            <FieldRow label="Last backup" value="May 30, 02:00 AM" />
            <FieldRow label="Disaster recovery" value="RTO 4hr / RPO 1hr" />
            <FieldRow label="Failed logins (24h)" value={<Badge variant="amber">1 blocked</Badge>} />
          </Card>
        </TwoCol>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-slate-500" />
              <CardTitle>Security Audit Log</CardTitle>
            </div>
            <Btn>Export Log</Btn>
          </CardHeader>
          <Table>
            <thead>
              <tr><Th>Event</Th><Th>User</Th><Th>Company</Th><Th>Timestamp</Th><Th>IP Address</Th></tr>
            </thead>
            <tbody>
              {db.auditLogs.map((log) => (
                <Tr key={log.id}>
                  <Td className={log.action.includes("Failed") ? "font-medium text-red-600" : "font-medium"}>
                    {log.action}
                  </Td>
                  <Td className="text-xs">{log.user}</Td>
                  <Td>{log.company}</Td>
                  <Td className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString()}</Td>
                  <Td className="font-mono text-xs">{log.ipAddress}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-slate-600">
            <span className="font-semibold text-amber-700">Security note: </span>
            1 blocked login attempt from an unrecognized IP (195.x.x.x). Account lockout policy triggered. No breach detected. Monitoring active.
          </div>
        </Card>
      </SectionPage>
    </>
  );
}
