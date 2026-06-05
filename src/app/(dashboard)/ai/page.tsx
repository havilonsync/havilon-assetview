import { db } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
  Card, CardHeader, CardTitle, MetricCard, MetricsGrid, PageTopBar,
  SectionPage, TwoCol, Timeline, FieldRow, Btn,
} from "@/components/ui";
import { Badge } from "@/components/ui/Badge";
import { Search, AlertTriangle, Brain, TrendingDown } from "lucide-react";

export default function AIPage() {
  return (
    <>
      <PageTopBar title="AI Knowledge Layer" subtitle="Summaries · Anomaly Detection · Search · Reminders · Reports">
        <Badge variant="purple"><Brain size={10} /> AI Active</Badge>
      </PageTopBar>
      <SectionPage>
        <MetricsGrid>
          <MetricCard label="AI Actions (30d)" value={284} />
          <MetricCard label="Anomalies Flagged" value={6} />
          <MetricCard label="Auto-Reminders Sent" value={41} />
          <MetricCard label="Reports Generated" value={22} />
        </MetricsGrid>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain size={16} className="text-purple-600" />
              <CardTitle>AI Portfolio Summary</CardTitle>
            </div>
            <Badge variant="purple">Generated May 30, 2026</Badge>
          </CardHeader>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm leading-relaxed text-slate-700">
            <p className="font-semibold text-purple-900 mb-2">Portfolio health is good with 3 items requiring immediate attention.</p>
            <p className="mb-2">
              Occupancy at <strong>83%</strong> is slightly below the 85% target. Units 2, 9C, and 14 are vacant — Unit 2 is mid-eviction, Unit 9C needs repairs before listing, Unit 14 has been vacant <strong>47 days</strong> (action recommended to prevent further revenue loss).
            </p>
            <p className="mb-2">
              <strong>Financial:</strong> May rent collection is 97.2% — above average. INV-0829 (P. Walsh, $840) is 15 days overdue; recommend follow-up. All trust accounts are balanced and reconciled.
            </p>
            <p className="mb-2">
              <strong>Compliance:</strong> 2 items are overdue — fire safety inspection at 220 Oak Ave and CO certification at 5501 Maple. Both require immediate action to avoid regulatory risk and potential fines.
            </p>
            <p>
              <strong>Upcoming:</strong> 3 lease renewals in the next 60 days. The renewal offer for F. Nguyen (Unit 7A) has not been acknowledged — a follow-up is scheduled for June 3.
            </p>
          </div>
        </Card>

        <TwoCol>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                <CardTitle>Anomaly Alerts</CardTitle>
              </div>
              <Badge variant="amber">6 active</Badge>
            </CardHeader>
            <Timeline items={[
              { text: "Unit 14 vacant 47 days — no listing activity", sub: `Risk: ~${formatCurrency(3100)} in lost revenue`, color: "red" },
              { text: "P. Walsh invoice overdue 15 days", sub: "$840 · No payment attempt on file", color: "amber" },
              { text: "WO-1127 overdue (door lock — commercial)", sub: "Commercial tenant — liability risk", color: "amber" },
              { text: "900 Commerce reserve below threshold", sub: `${formatCurrency(24100)} vs ${formatCurrency(28800)} recommended`, color: "amber" },
              { text: "2 compliance items overdue", sub: "Fire safety + CO cert — regulatory exposure", color: "red" },
              { text: "F. Nguyen renewal not acknowledged", sub: "Lease ends Jun 30 — 31 days away", color: "blue" },
            ]} />
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search size={14} className="text-slate-500" />
                <CardTitle>AI Search</CardTitle>
              </div>
            </CardHeader>
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  readOnly
                  defaultValue="leases expiring in 60 days"
                  className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
                />
                <Btn variant="primary">Search</Btn>
              </div>
            </div>
            <div className="text-xs text-slate-500 mb-2 font-medium">3 results — leases expiring within 60 days</div>
            <FieldRow label="Unit 7A — F. Nguyen" value="Expires Jun 30, 2026" />
            <FieldRow label="Unit 12C — D. Park" value="Expires Jul 8, 2026" />
            <FieldRow label="Unit 3B — A. Green" value="Expires Jul 22, 2026" />
            <div className="mt-4 flex gap-2">
              <Btn>Batch Send Renewals</Btn>
              <Btn>Export List</Btn>
            </div>
          </Card>
        </TwoCol>

        <Card>
          <CardHeader><CardTitle>AI-Assisted Reports</CardTitle></CardHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Monthly Portfolio Report", sub: "Generated May 1" },
              { label: "Vacancy Analysis", sub: "Generated May 15" },
              { label: "Maintenance Cost Trends", sub: "Generated May 20" },
              { label: "Owner Performance Summary", sub: "Generated May 25" },
            ].map((r) => (
              <div key={r.label} className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm font-medium text-slate-800 mb-1">{r.label}</div>
                <div className="text-xs text-slate-400 mb-2">{r.sub}</div>
                <Btn>Download PDF</Btn>
              </div>
            ))}
          </div>
        </Card>
      </SectionPage>
    </>
  );
}
