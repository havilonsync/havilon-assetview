"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { TimeRange, PerformanceDataPoint, CostImpactEvent, PerformanceSummary } from "@/lib/performance/data";
import {
  Card, CardHeader, CardTitle, PageTopBar, SectionPage, TwoCol, Btn,
} from "@/components/ui";
import {
  TrendingUp, TrendingDown, Minus, Brain, AlertTriangle,
  CheckCircle, ArrowUpRight, ArrowDownRight, Loader2, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────
interface PerformanceResponse {
  range: TimeRange;
  data: PerformanceDataPoint[];
  summary: PerformanceSummary;
  costEvents: CostImpactEvent[];
  aiNarrative: string;
  generatedAt: string;
}

// ─── Time range config ────────────────────────────────────────────────
const RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d",  label: "7 Days"  },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "1y",  label: "1 Year"  },
  { value: "2y",  label: "2 Years" },
  { value: "5y",  label: "5 Years" },
  { value: "7y",  label: "7 Years" },
];

// ─── Helpers ─────────────────────────────────────────────────────────
const fmt = (n: number) => formatCurrency(n);
const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtK = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;

function DeltaBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (Math.abs(value) < 0.1) return <span className="text-xs text-slate-400 flex items-center gap-0.5"><Minus size={10} /> 0{suffix}</span>;
  const up = value > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function KPICard({ label, value, delta, deltaLabel, color = "slate" }: {
  label: string; value: string; delta?: number; deltaLabel?: string; color?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-1 font-medium">{label}</div>
      <div className={`text-2xl font-semibold text-slate-900 mb-1`}>{value}</div>
      {delta !== undefined && (
        <div className="flex items-center gap-1.5">
          <DeltaBadge value={delta} />
          {deltaLabel && <span className="text-xs text-slate-400">{deltaLabel}</span>}
        </div>
      )}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#f59e0b",
  vacancy:     "#ef4444",
  insurance:   "#3b82f6",
  legal:       "#8b5cf6",
  capex:       "#06b6d4",
  late_payment:"#f97316",
  compliance:  "#ec4899",
};

const CATEGORY_LABELS: Record<string, string> = {
  maintenance: "Maintenance", vacancy: "Vacancy", insurance: "Insurance",
  legal: "Legal", capex: "CapEx", late_payment: "Late Payment", compliance: "Compliance",
};

function CostEvent({ event }: { event: CostImpactEvent }) {
  const color = CATEGORY_COLORS[event.category] ?? "#94a3b8";
  const isPositive = event.impact === "positive";
  const isNegative = event.impact === "negative";
  return (
    <div className="flex gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: color }}>
          {event.category === "maintenance" ? "M" : event.category === "vacancy" ? "V" :
           event.category === "insurance" ? "I" : event.category === "legal" ? "L" :
           event.category === "capex" ? "C" : event.category === "compliance" ? "CO" : "LP"}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium text-slate-800 leading-tight">{event.title}</div>
          <div className={`text-sm font-semibold flex-shrink-0 ${isPositive ? "text-emerald-600" : isNegative ? "text-red-500" : "text-slate-600"}`}>
            {event.amount === 0 ? "—" : isPositive && event.amount < 0 ? `+${fmt(Math.abs(event.amount))}` : isPositive ? fmt(event.amount) : isNegative ? `-${fmt(event.amount)}` : fmt(event.amount)}
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-0.5">{event.description}</div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-slate-400">{new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          {event.propertyName && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{event.propertyName}</span>}
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isPositive ? "bg-emerald-50 text-emerald-700" : isNegative ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"}`}>
            {isPositive ? "Positive" : isNegative ? "Negative" : "Neutral"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Custom tooltip ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[160px]">
      <div className="font-semibold text-slate-700 mb-2">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex justify-between gap-4 mb-1">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium">{typeof entry.value === "number" && entry.value > 1000 ? fmtK(entry.value) : entry.value}{entry.dataKey === "occupancyRate" ? "%" : ""}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────
export default function PerformancePage() {
  const [range, setRange] = useState<TimeRange>("1y");
  const [activeChart, setActiveChart] = useState<"noi" | "revenue" | "occupancy" | "expenses">("noi");
  const [perfData, setPerfData] = useState<PerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (r: TimeRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/performance?range=${r}`);
      if (!res.ok) throw new Error("Failed to load performance data");
      const data = await res.json();
      setPerfData(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(range); }, [range, fetchData]);

  const refreshAI = async () => {
    if (!perfData) return;
    setAiLoading(true);
    const res = await fetch(`/api/performance?range=${range}`);
    if (res.ok) { const d = await res.json(); setPerfData(d); }
    setAiLoading(false);
  };

  const s = perfData?.summary;
  const data = perfData?.data ?? [];
  const costEvents = perfData?.costEvents ?? [];
  const negativeEvents = costEvents.filter((e) => e.impact === "negative");
  const positiveEvents = costEvents.filter((e) => e.impact === "positive");

  const chartConfigs = {
    noi: { label: "Net Operating Income", dataKeys: [{ key: "noi", name: "NOI", color: "#2563eb" }, { key: "revenue", name: "Revenue", color: "#10b981" }] },
    revenue: { label: "Revenue vs Expenses", dataKeys: [{ key: "revenue", name: "Revenue", color: "#10b981" }, { key: "expenses", name: "Expenses", color: "#ef4444" }] },
    occupancy: { label: "Occupancy Rate", dataKeys: [{ key: "occupancyRate", name: "Occupancy %", color: "#8b5cf6" }] },
    expenses: { label: "Expense Breakdown", dataKeys: [
      { key: "maintenanceCost", name: "Maintenance", color: "#f59e0b" },
      { key: "managementFee", name: "Mgmt Fee", color: "#3b82f6" },
      { key: "insuranceCost", name: "Insurance", color: "#06b6d4" },
      { key: "vacancyLoss", name: "Vacancy Loss", color: "#ef4444" },
    ]},
  };

  const cfg = chartConfigs[activeChart];

  return (
    <>
      <PageTopBar title="Performance Overview" subtitle="Portfolio analytics · Cost analysis · AI-generated insights">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                range === r.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </PageTopBar>

      <SectionPage>
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 size={28} className="animate-spin text-blue-500 mx-auto mb-3" />
              <div className="text-sm text-slate-400">Loading performance data…</div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-600 font-medium">{error}</div>
            <Btn onClick={() => fetchData(range)} className="mt-3">Retry</Btn>
          </div>
        ) : (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard label="Total Revenue" value={fmtK(s?.totalRevenue ?? 0)} delta={s?.revenueGrowth} deltaLabel="vs prior" />
              <KPICard label="Net Operating Income" value={fmtK(s?.totalNOI ?? 0)} delta={s?.noiMargin} deltaLabel="margin" />
              <KPICard label="Total Expenses" value={fmtK(s?.totalExpenses ?? 0)} delta={s?.expenseGrowth} deltaLabel="vs prior" />
              <KPICard label="Avg Occupancy" value={`${s?.avgOccupancyRate ?? 0}%`} delta={s?.occupancyDelta} deltaLabel="vs prior" />
              <KPICard label="Vacancy Loss" value={fmtK(s?.totalVacancyLoss ?? 0)} />
              <KPICard label="Capital Expenditure" value={fmtK(s?.totalCapex ?? 0)} />
            </div>

            {/* Main Chart */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{cfg.label}</CardTitle>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {RANGES.find((r) => r.value === range)?.label} view · {data.length} data points
                  </div>
                </div>
                <div className="flex gap-1">
                  {(["noi","revenue","occupancy","expenses"] as const).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveChart(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeChart === key ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {key === "noi" ? "NOI" : key === "revenue" ? "Revenue" : key === "occupancy" ? "Occupancy" : "Expenses"}
                    </button>
                  ))}
                </div>
              </CardHeader>

              <ResponsiveContainer width="100%" height={300}>
                {activeChart === "expenses" ? (
                  <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {cfg.dataKeys.map((dk) => (
                      <Bar key={dk.key} dataKey={dk.key} name={dk.name} fill={dk.color} stackId="a" radius={[2, 2, 0, 0]} />
                    ))}
                  </BarChart>
                ) : activeChart === "occupancy" ? (
                  <LineChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[60, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    {cfg.dataKeys.map((dk) => (
                      <Line key={dk.key} type="monotone" dataKey={dk.key} name={dk.name} stroke={dk.color} strokeWidth={2.5} dot={false} />
                    ))}
                    {/* Target line at 85% */}
                    <Line type="monotone" dataKey={() => 85} name="Target (85%)" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                ) : (
                  <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      {cfg.dataKeys.map((dk) => (
                        <linearGradient key={dk.key} id={`grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={dk.color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={dk.color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {cfg.dataKeys.map((dk) => (
                      <Area key={dk.key} type="monotone" dataKey={dk.key} name={dk.name} stroke={dk.color} strokeWidth={2.5}
                        fill={`url(#grad-${dk.key})`} dot={false} />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </Card>

            {/* AI Narrative + Cost Events */}
            <TwoCol>
              {/* AI Narrative */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Brain size={13} className="text-purple-600" />
                    </div>
                    <CardTitle>AI Performance Summary</CardTitle>
                  </div>
                  <Btn onClick={refreshAI}>
                    <RefreshCw size={11} className={aiLoading ? "animate-spin" : ""} />
                    Refresh
                  </Btn>
                </CardHeader>
                {aiLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Generating analysis…
                  </div>
                ) : (
                  <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
                    {(perfData?.aiNarrative ?? "").split("\n\n").filter(Boolean).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Generated {perfData?.generatedAt ? new Date(perfData.generatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      {process.env.NEXT_PUBLIC_AI_ENABLED === "true" ? "Anthropic claude-sonnet" : "Template analysis"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Cost Impact Events */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <CardTitle>Cost Impact Events</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-red-500 font-medium">{negativeEvents.length} negative</span>
                    <span>·</span>
                    <span className="text-emerald-600 font-medium">{positiveEvents.length} positive</span>
                  </div>
                </CardHeader>
                <div className="max-h-[420px] overflow-y-auto -mx-1 px-1">
                  {costEvents.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400">No cost events in this period</div>
                  ) : (
                    costEvents.map((event, i) => <CostEvent key={i} event={event} />)
                  )}
                </div>
              </Card>
            </TwoCol>

            {/* Expense Breakdown + Occupancy Combined */}
            <TwoCol>
              <Card>
                <CardHeader><CardTitle>Revenue vs NOI Trend</CardTitle></CardHeader>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="expenses" name="Expenses" fill="#fca5a5" stackId="r" />
                    <Bar dataKey="noi" name="NOI" fill="#2563eb" stackId="r" radius={[2, 2, 0, 0]} />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <CardHeader><CardTitle>Occupancy Rate Trend</CardTitle></CardHeader>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis domain={[60, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="occupancyRate" name="Occupancy" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#occGrad)" dot={false} />
                    <Line type="monotone" dataKey={() => 85} name="Target" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-purple-500 rounded" /> Occupancy</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-emerald-500 rounded" style={{ backgroundImage: "repeating-linear-gradient(90deg, #10b981 0, #10b981 4px, transparent 4px, transparent 8px)" }} /> 85% target</div>
                </div>
              </Card>
            </TwoCol>

            {/* Period summary table */}
            <Card>
              <CardHeader><CardTitle>Period-by-Period Summary</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {["Period", "Revenue", "Expenses", "NOI", "NOI Margin", "Occupancy", "Maintenance", "Vacancy Loss", "CapEx"].map((h) => (
                        <th key={h} className="text-left text-slate-500 font-medium px-3 py-2 border-b border-slate-100 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => {
                      const margin = row.revenue > 0 ? ((row.noi / row.revenue) * 100).toFixed(1) : "0";
                      const isLast = i === data.length - 1;
                      return (
                        <tr key={row.period} className={`hover:bg-slate-50 ${isLast ? "font-semibold bg-slate-50/50" : ""}`}>
                          <td className="px-3 py-2 border-b border-slate-50 text-slate-700 whitespace-nowrap">{row.period}</td>
                          <td className="px-3 py-2 border-b border-slate-50 text-slate-800">{fmtK(row.revenue)}</td>
                          <td className="px-3 py-2 border-b border-slate-50 text-slate-800">{fmtK(row.expenses)}</td>
                          <td className={`px-3 py-2 border-b border-slate-50 font-medium ${row.noi >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtK(row.noi)}</td>
                          <td className={`px-3 py-2 border-b border-slate-50 ${Number(margin) >= 35 ? "text-emerald-700" : Number(margin) >= 25 ? "text-amber-600" : "text-red-600"}`}>{margin}%</td>
                          <td className={`px-3 py-2 border-b border-slate-50 ${row.occupancyRate >= 85 ? "text-emerald-700" : row.occupancyRate >= 78 ? "text-amber-600" : "text-red-600"}`}>{row.occupancyRate}%</td>
                          <td className="px-3 py-2 border-b border-slate-50 text-slate-600">{fmtK(row.maintenanceCost)}</td>
                          <td className="px-3 py-2 border-b border-slate-50 text-red-500">{fmtK(row.vacancyLoss)}</td>
                          <td className="px-3 py-2 border-b border-slate-50 text-slate-600">{row.capitalExpenditure > 0 ? fmtK(row.capitalExpenditure) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </SectionPage>
    </>
  );
}
