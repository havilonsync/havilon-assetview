// Performance data engine
// Generates time-series data for revenue, occupancy, expenses, NOI, and cost events
// In production: replaced by real Prisma aggregate queries grouped by period

export type TimeRange = "7d" | "30d" | "90d" | "1y" | "2y" | "5y" | "7y";
export type Granularity = "day" | "week" | "month" | "quarter" | "year";

export interface PerformanceDataPoint {
  period: string;         // display label
  date: string;           // ISO date (start of period)
  revenue: number;        // gross rent collected
  expenses: number;       // total operating expenses
  noi: number;            // net operating income (revenue - expenses)
  occupancyRate: number;  // 0–100
  maintenanceCost: number;
  managementFee: number;
  insuranceCost: number;
  vacancyLoss: number;    // lost revenue from vacant units
  latePayments: number;   // $ in late fees / uncollected
  capitalExpenditure: number;
}

export interface CostImpactEvent {
  date: string;
  category: "maintenance" | "vacancy" | "insurance" | "legal" | "capex" | "late_payment" | "compliance";
  title: string;
  amount: number;
  impact: "negative" | "positive" | "neutral";
  description: string;
  propertyName?: string;
}

export interface PerformanceSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalNOI: number;
  avgOccupancyRate: number;
  noiMargin: number;
  revenueGrowth: number;    // % vs prior period
  expenseGrowth: number;
  occupancyDelta: number;
  topCostDriver: string;
  totalVacancyLoss: number;
  totalCapex: number;
  totalMaintenanceCost: number;
}

function granularityForRange(range: TimeRange): Granularity {
  if (range === "7d") return "day";
  if (range === "30d") return "day";
  if (range === "90d") return "week";
  if (range === "1y") return "month";
  if (range === "2y") return "month";
  if (range === "5y") return "quarter";
  return "year"; // 7y
}

function formatPeriodLabel(date: Date, granularity: Granularity): string {
  if (granularity === "day") return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (granularity === "week") return `W${getWeekNumber(date)} '${date.getFullYear().toString().slice(2)}`;
  if (granularity === "month") return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  if (granularity === "quarter") {
    const q = Math.floor(date.getMonth() / 3) + 1;
    return `Q${q} '${date.getFullYear().toString().slice(2)}`;
  }
  return date.getFullYear().toString();
}

function getWeekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
}

// Seeded random for consistent but realistic data
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateDataPoint(date: Date, index: number, range: TimeRange): PerformanceDataPoint {
  const granularity = granularityForRange(range);
  
  // Base monthly revenue ~$284K, growing ~0.5%/month
  const monthsElapsed = index * (granularity === "day" ? 1/30 : granularity === "week" ? 1/4 : granularity === "quarter" ? 3 : granularity === "year" ? 12 : 1);
  const baseRevenue = 284000 * Math.pow(1.005, monthsElapsed);
  
  // Add realistic variance
  const noise = (seededRandom(index * 7 + 13) - 0.5) * 0.04;
  
  // Seasonal dip in winter
  const month = date.getMonth();
  const seasonal = month >= 11 || month <= 1 ? -0.02 : month >= 5 && month <= 8 ? 0.02 : 0;

  const revenue = Math.round(baseRevenue * (1 + noise + seasonal));
  
  // Occupancy: 78–92%, trending up slightly over time
  const baseOccupancy = Math.min(93, 79 + monthsElapsed * 0.08);
  const occNoise = (seededRandom(index * 3 + 7) - 0.5) * 5;
  const occupancyRate = Math.max(72, Math.min(97, baseOccupancy + occNoise));

  // Expenses: 55–65% of revenue
  const expenseRatio = 0.58 + (seededRandom(index * 11 + 3) - 0.5) * 0.08;
  const expenses = Math.round(revenue * expenseRatio);

  // Expense breakdown
  const maintenanceCost = Math.round(expenses * (0.18 + seededRandom(index * 5) * 0.08));
  const managementFee = Math.round(revenue * 0.09);
  const insuranceCost = Math.round(expenses * 0.07);
  const capitalExpenditure = seededRandom(index * 17) > 0.8 ? Math.round(8000 + seededRandom(index) * 22000) : 0;
  const vacancyLoss = Math.round(revenue * ((100 - occupancyRate) / 100) * 0.9);
  const latePayments = Math.round(revenue * (seededRandom(index * 23) * 0.015));

  const noi = revenue - expenses;

  return {
    period: formatPeriodLabel(date, granularity),
    date: date.toISOString().split("T")[0],
    revenue,
    expenses,
    noi,
    occupancyRate: Math.round(occupancyRate * 10) / 10,
    maintenanceCost,
    managementFee,
    insuranceCost,
    vacancyLoss,
    latePayments,
    capitalExpenditure,
  };
}

export function generatePerformanceData(range: TimeRange, propertyId?: string): PerformanceDataPoint[] {
  const granularity = granularityForRange(range);
  const now = new Date("2026-05-30");
  const points: PerformanceDataPoint[] = [];

  const configs: Record<TimeRange, { count: number; stepMs: number }> = {
    "7d":  { count: 7,   stepMs: 86400000 },
    "30d": { count: 30,  stepMs: 86400000 },
    "90d": { count: 13,  stepMs: 7 * 86400000 },
    "1y":  { count: 12,  stepMs: 30 * 86400000 },
    "2y":  { count: 24,  stepMs: 30 * 86400000 },
    "5y":  { count: 20,  stepMs: 91 * 86400000 },
    "7y":  { count: 7,   stepMs: 365 * 86400000 },
  };

  const { count, stepMs } = configs[range];

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * stepMs);
    points.push(generateDataPoint(date, count - i, range));
  }

  return points;
}

export function generateCostImpactEvents(range: TimeRange): CostImpactEvent[] {
  const allEvents: CostImpactEvent[] = [
    { date: "2026-05-28", category: "maintenance", title: "HVAC Emergency — 5501 Maple", amount: 3200, impact: "negative", description: "Emergency HVAC replacement required for Unit 2. Tenant relocation costs added $400.", propertyName: "5501 Maple St" },
    { date: "2026-05-15", category: "vacancy", title: "Unit 14 — Extended Vacancy (47 days)", amount: 3100, impact: "negative", description: "Vacancy dragged into second month. Market rate competition in zip code 75204 slowing absorption.", propertyName: "220 Oak Ave" },
    { date: "2026-05-02", category: "insurance", title: "CLM-0091 Approved — Roof Repair", amount: -12400, impact: "positive", description: "Insurance payout of $12,400 for roof damage offset capital expenditure for Q1.", propertyName: "220 Oak Ave" },
    { date: "2026-04-18", category: "legal", title: "Eviction Filing — Unit 2", amount: 1850, impact: "negative", description: "Legal fees and court filing costs. 3 months of lost rent exposure ($5,850) if not resolved by hearing.", propertyName: "220 Oak Ave" },
    { date: "2026-04-03", category: "maintenance", title: "Kitchen Renovation — 5501 Maple", amount: 8700, impact: "neutral", description: "Planned capital improvement. Will support +$250/mo rent increase at next renewal in Dec 2026.", propertyName: "5501 Maple St" },
    { date: "2026-03-20", category: "compliance", title: "Fire Safety Inspection — Overdue", amount: 480, impact: "negative", description: "Late compliance fee + expedited inspection cost. Preventable with 30-day advance scheduling.", propertyName: "220 Oak Ave" },
    { date: "2026-03-01", category: "late_payment", title: "Late Payments — 3 Units", amount: 1240, impact: "negative", description: "Three tenants paid after the 5-day grace period. Automated reminder system not yet active for these units.", propertyName: "Multiple" },
    { date: "2026-02-01", category: "capex", title: "ADA Ramp Installation — 900 Commerce", amount: 9200, impact: "neutral", description: "Compliance-required capital expenditure. Required by city ordinance effective March 2026.", propertyName: "900 Commerce Blvd" },
    { date: "2026-01-12", category: "insurance", title: "Roof Damage Claim Filed — Storm", amount: 0, impact: "neutral", description: "Storm damage claim filed. $12,400 payout received in May. No out-of-pocket cost after deductible.", propertyName: "220 Oak Ave" },
    { date: "2025-12-01", category: "vacancy", title: "Seasonal Vacancy Spike — Q4", amount: 5200, impact: "negative", description: "Three units turned over in November. Q4 typically has 8–12% higher vacancy due to seasonal move patterns.", propertyName: "Portfolio-wide" },
    { date: "2025-11-15", category: "capex", title: "Roof Replacement — 220 Oak Ave", amount: 28000, impact: "positive", description: "Full roof replacement completed. Extends asset life by 20+ years. Supported by insurance payout + reserves.", propertyName: "220 Oak Ave" },
    { date: "2025-09-01", category: "maintenance", title: "Plumbing Overhaul — 220 Oak", amount: 6400, impact: "negative", description: "Aging pipe infrastructure required full unit-by-unit inspection. Deferred maintenance cost from 2022–2023.", propertyName: "220 Oak Ave" },
    { date: "2025-06-15", category: "maintenance", title: "HVAC Preventive Maintenance — Portfolio", amount: 2800, impact: "positive", description: "Scheduled preventive maintenance across 6 units. Avoided 2 potential emergency failures estimated at $9,000.", propertyName: "Portfolio-wide" },
    { date: "2025-03-01", category: "vacancy", title: "Commercial Tenant Renewal — 900 Commerce", amount: -4800, impact: "positive", description: "TechStart LLC renewed 3-year lease at $4,800/mo (+$200 increase). Zero vacancy loss. Receipt R-1840 issued.", propertyName: "900 Commerce Blvd" },
    { date: "2024-11-01", category: "legal", title: "Liability Claim — Slip & Fall", amount: 0, impact: "negative", description: "Insurance assumed legal defense costs. Potential settlement risk. Legal hold on CLM-0084 still active.", propertyName: "220 Oak Ave" },
    { date: "2024-06-01", category: "capex", title: "Unit 4B Lease-Up Renovation", amount: 4200, impact: "positive", description: "Light renovation between tenants. Secured new lease at $2,200/mo ($150 above prior). 18-month payback.", propertyName: "220 Oak Ave" },
    { date: "2023-12-01", category: "insurance", title: "Annual Policy Renewals — Portfolio", amount: 13100, impact: "neutral", description: "All three policies renewed. Combined premium $13,100/yr. No change in coverage terms.", propertyName: "Portfolio-wide" },
    { date: "2023-07-01", category: "vacancy", title: "Unit 7A New Lease — F. Nguyen", amount: -2350, impact: "positive", description: "New tenant signed at $2,350/mo. 4-week vacancy period. Leasing fee: $1,175. Net positive from month 2.", propertyName: "220 Oak Ave" },
    { date: "2022-09-01", category: "capex", title: "HVAC System Upgrade — 220 Oak Common", amount: 14500, impact: "positive", description: "Full common-area HVAC upgrade. Energy costs reduced ~18%. Supported by utility rebate of $2,400.", propertyName: "220 Oak Ave" },
    { date: "2020-01-15", category: "capex", title: "Asset Acquisition — 5501 Maple St", amount: 480000, impact: "neutral", description: "Single-family acquisition at $480K. Current estimated value: $610K. IRR tracking at 11.2% since acquisition.", propertyName: "5501 Maple St" },
  ];

  const cutoffs: Record<TimeRange, number> = {
    "7d": 7, "30d": 30, "90d": 90, "1y": 365, "2y": 730, "5y": 1825, "7y": 2555,
  };
  const cutoffDays = cutoffs[range];
  const now = new Date("2026-05-30");

  return allEvents.filter((e) => {
    const daysDiff = (now.getTime() - new Date(e.date).getTime()) / 86400000;
    return daysDiff <= cutoffDays;
  });
}

export function computeSummary(data: PerformanceDataPoint[], prevData: PerformanceDataPoint[]): PerformanceSummary {
  const sum = (arr: PerformanceDataPoint[], key: keyof PerformanceDataPoint) =>
    arr.reduce((s, d) => s + (Number(d[key]) || 0), 0);

  const totalRevenue = sum(data, "revenue");
  const totalExpenses = sum(data, "expenses");
  const totalNOI = sum(data, "noi");
  const avgOccupancyRate = data.reduce((s, d) => s + d.occupancyRate, 0) / Math.max(data.length, 1);
  const noiMargin = totalRevenue > 0 ? (totalNOI / totalRevenue) * 100 : 0;

  const prevRevenue = sum(prevData, "revenue");
  const prevExpenses = sum(prevData, "expenses");
  const prevOccupancy = prevData.reduce((s, d) => s + d.occupancyRate, 0) / Math.max(prevData.length, 1);

  const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const expenseGrowth = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
  const occupancyDelta = avgOccupancyRate - prevOccupancy;

  const totalMaintenanceCost = sum(data, "maintenanceCost");
  const totalVacancyLoss = sum(data, "vacancyLoss");
  const totalCapex = sum(data, "capitalExpenditure");
  const totalInsurance = sum(data, "insuranceCost");

  const costBreakdown = [
    { name: "Maintenance", value: totalMaintenanceCost },
    { name: "Vacancy Loss", value: totalVacancyLoss },
    { name: "Capital Expenditure", value: totalCapex },
    { name: "Insurance", value: totalInsurance },
  ];
  const topCostDriver = costBreakdown.sort((a, b) => b.value - a.value)[0]?.name ?? "Maintenance";

  return {
    totalRevenue, totalExpenses, totalNOI, avgOccupancyRate: Math.round(avgOccupancyRate * 10) / 10,
    noiMargin: Math.round(noiMargin * 10) / 10, revenueGrowth: Math.round(revenueGrowth * 10) / 10,
    expenseGrowth: Math.round(expenseGrowth * 10) / 10, occupancyDelta: Math.round(occupancyDelta * 10) / 10,
    topCostDriver, totalVacancyLoss, totalCapex, totalMaintenanceCost,
  };
}
