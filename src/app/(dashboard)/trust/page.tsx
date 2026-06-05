import { db } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Table, Th, Td, Tr, FieldRow, AIBox, Btn,
} from "@/components/ui";
import { Download, Send } from "lucide-react";

export default function TrustPage() {
  const totalBalance = db.trustAccounts.reduce((s, t) => s + t.balance, 0);
  const totalReserve = db.trustAccounts.reduce((s, t) => s + t.reserveBalance, 0);
  const kim = db.trustAccounts[0];

  return (
    <>
      <PageTopBar title="Trust Accounting" subtitle="Owner Funds · Reserves · Segregation · Statements">
        <Btn variant="primary"><Send size={13} /> Disburse Funds</Btn>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="Total Trust Balance" value={formatCurrency(totalBalance + totalReserve)} />
          <MetricCard label="Owner Accounts" value={db.trustAccounts.length} />
          <MetricCard label="Reserve Fund" value={formatCurrency(totalReserve)} />
          <MetricCard label="Next Disbursement" value="Jun 10" />
        </MetricsGrid>

        <Card>
          <CardHeader><CardTitle>Owner Account Balances</CardTitle></CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Owner</Th><Th>Properties</Th><Th>Collected (May)</Th>
                <Th>Expenses</Th><Th>Mgmt Fee</Th><Th>Net Balance</Th><Th>Statement</Th>
              </tr>
            </thead>
            <tbody>
              {db.trustAccounts.map((ta) => (
                <Tr key={ta.id}>
                  <Td className="font-medium">{ta.ownerName}</Td>
                  <Td>{ta.properties}</Td>
                  <Td>{formatCurrency(ta.collectedMTD)}</Td>
                  <Td className="text-red-600">–{formatCurrency(ta.expensesMTD)}</Td>
                  <Td className="text-red-600">–{formatCurrency(ta.managementFee)}</Td>
                  <Td className="font-semibold text-emerald-700">{formatCurrency(ta.balance)}</Td>
                  <Td><Btn>View</Btn></Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader>
              <CardTitle>{kim.ownerName} — May Statement</CardTitle>
              <Btn><Download size={12} /> PDF</Btn>
            </CardHeader>
            <FieldRow label="Gross rent collected" value={formatCurrency(kim.collectedMTD)} />
            <FieldRow label="Maintenance" value={<span className="text-red-500">–$1,200</span>} />
            <FieldRow label="Repairs" value={<span className="text-red-500">–$900</span>} />
            <FieldRow label={`Mgmt fee (9%)`} value={<span className="text-red-500">–{formatCurrency(kim.managementFee)}</span>} />
            <FieldRow label="Reserve contribution" value={<span className="text-red-500">–$400</span>} />
            <div className="flex justify-between items-start py-2 font-semibold text-sm border-t border-slate-200 mt-1">
              <span>Net disbursement</span>
              <span className="text-emerald-700">{formatCurrency(kim.netDisbursement)}</span>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Reserve Accounts</CardTitle></CardHeader>
            <FieldRow label="220 Oak Ave" value={formatCurrency(42000)} />
            <FieldRow label="5501 Maple St" value={formatCurrency(18500)} />
            <FieldRow label="900 Commerce" value={formatCurrency(24100)} />
            <FieldRow label="General Reserve" value={formatCurrency(101400)} />
            <div className="flex justify-between items-start py-2 font-semibold text-sm border-t border-slate-200 mt-1">
              <span>Total Reserves</span>
              <span>{formatCurrency(totalReserve)}</span>
            </div>
            <AIBox>900 Commerce reserve is below the recommended 3-month threshold. Consider increasing contribution by $800/mo.</AIBox>
          </Card>
        </TwoCol>
      </SectionPage>
    </>
  );
}
