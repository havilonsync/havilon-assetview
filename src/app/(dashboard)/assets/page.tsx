import { db } from "@/lib/store";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, Timeline, Btn,
} from "@/components/ui";
import { Badge, statusVariant } from "@/components/ui/Badge";

export default function AssetsPage() {
  const asset = db.assets[0];
  return (
    <>
      <PageTopBar title="Asset Lifecycle Records" subtitle="Full history · Every asset, every event" />
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Total Assets" value={db.assets.length} />
          <MetricCard label="Lifecycle Events (YTD)" value="1,847" />
          <MetricCard label="Avg Asset Age" value="14 yrs" />
          <MetricCard label="Dispositions YTD" value={3} />
        </MetricsGrid>

        <Card>
          <CardHeader>
            <CardTitle>All Assets</CardTitle>
            <Btn variant="primary">+ Add Asset</Btn>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Code</Th><Th>Address</Th><Th>Type</Th><Th>Owner</Th>
                <Th>Units</Th><Th>Purchase Price</Th><Th>Current Value</Th><Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {db.assets.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-mono text-xs">{a.assetCode}</Td>
                  <Td className="font-medium">{a.address}</Td>
                  <Td><span className="capitalize">{a.type.replace("_", " ")}</span></Td>
                  <Td>{a.ownerName}</Td>
                  <Td>{a.occupiedUnits}/{a.units}</Td>
                  <Td>{formatCurrency(a.purchasePrice)}</Td>
                  <Td>{formatCurrency(a.currentValue)}</Td>
                  <Td><Badge variant={statusVariant(a.status)}>{a.status}</Badge></Td>
                  <Td><Btn>View</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader>
              <CardTitle>{asset.name} — Asset Record</CardTitle>
              <Badge variant="green">Active</Badge>
            </CardHeader>
            <FieldRow label="Asset ID" value={<span className="font-mono text-xs">{asset.assetCode}</span>} />
            <FieldRow label="Type" value={<span className="capitalize">{asset.type.replace("_", " ")}</span>} />
            <FieldRow label="Acquired" value={formatDateShort(asset.acquiredAt)} />
            <FieldRow label="Purchase Price" value={formatCurrency(asset.purchasePrice)} />
            <FieldRow label="Current Value (Est.)" value={formatCurrency(asset.currentValue)} />
            <FieldRow label="Owner" value={asset.ownerName} />
            <FieldRow label="Units" value={`${asset.occupiedUnits} / ${asset.units} occupied`} />
            <FieldRow label="Liens" value={asset.lienStatus} />
            <FieldRow label="Legal Holds" value={asset.legalHolds ? <Badge variant="red">Active</Badge> : "None"} />
          </Card>

          <Card>
            <CardHeader><CardTitle>Lifecycle Timeline — {asset.name}</CardTitle></CardHeader>
            <Timeline items={[
              { text: "Lease renewal signed — Unit 4B (M. Torres)", sub: "May 28, 2026 · Receipt #R-2847", color: "green" },
              { text: "Annual inspection completed — Grade A", sub: "Mar 3, 2026 · Inspector: C. Davis", color: "blue" },
              { text: "Insurance claim filed — Roof damage (CLM-0091)", sub: "Jan 12, 2026 · $12,400 approved", color: "amber" },
              { text: "Capital project: Roof replacement completed", sub: "Nov 2025 · $28,000 · Vendor: Apex Roofing", color: "blue" },
              { text: "Asset onboarded to AssetView", sub: "Jan 2018 · Original deed recorded", color: "gray" },
            ]} />
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
