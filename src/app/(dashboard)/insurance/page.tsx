import { db } from "@/lib/store";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";
import { Plus } from "lucide-react";

export default function InsurancePage() {
  const totalCoverage = db.insurancePolicies.reduce((s, p) => s + p.coverageAmount, 0);
  const openClaims = db.insuranceClaims.filter((c) => c.status !== "approved" && c.status !== "denied").length;
  const detail = db.insuranceClaims[0];

  return (
    <>
      <PageTopBar title="Insurance Coordination" subtitle="Policies · Claims · Renewals · Documentation">
        <Btn variant="primary"><Plus size={13} /> File Claim</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Active Policies" value={db.insurancePolicies.length} />
          <MetricCard label="Open Claims" value={openClaims} />
          <MetricCard label="Renewals Due (60d)" value={3} />
          <MetricCard label="Total Coverage" value={formatCurrency(totalCoverage)} />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Active Claims</CardTitle></CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Claim #</Th><Th>Property</Th><Th>Incident</Th>
                <Th>Filed</Th><Th>Amount</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {db.insuranceClaims.map((claim) => (
                <Tr key={claim.id}>
                  <Td className="font-mono text-xs">{claim.claimNumber}</Td>
                  <Td>{claim.propertyAddress}</Td>
                  <Td>{claim.description}</Td>
                  <Td>{formatDateShort(claim.incidentDate)}</Td>
                  <Td>{claim.claimAmount ? formatCurrency(claim.claimAmount) : "TBD"}</Td>
                  <Td>
                    <Badge variant={statusVariant(claim.status)}>
                      {claim.status.replace(/_/g, " ")}
                    </Badge>
                  </Td>
                  <Td><Btn>View</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader><CardTitle>Policy Renewals</CardTitle></CardHeader>
            <Table>
              <thead><tr><Th>Policy</Th><Th>Carrier</Th><Th>Renews</Th><Th>Premium</Th></tr></thead>
              <tbody>
                {db.insurancePolicies.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-mono text-xs">#{p.policyNumber}</Td>
                    <Td>{p.carrier}</Td>
                    <Td>{formatDateShort(p.endDate)}</Td>
                    <Td>{formatCurrency(p.premium)}/yr</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claim #{detail.claimNumber} Detail</CardTitle>
              <Badge variant={statusVariant(detail.status)}>{detail.status.replace(/_/g, " ")}</Badge>
            </CardHeader>
            <FieldRow label="Incident date" value={formatDateShort(detail.incidentDate)} />
            <FieldRow label="Reported" value="Jan 12, 2026" />
            <FieldRow label="Adjuster" value={detail.adjusterName} />
            <FieldRow label="Approved" value={detail.approvedAmount ? formatCurrency(detail.approvedAmount) : "Pending"} />
            <FieldRow label="Documents" value={<Badge variant="blue">4 files</Badge>} />
            <FieldRow label="Payment" value="Received May 2" />
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
