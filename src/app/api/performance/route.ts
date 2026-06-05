import { NextRequest, NextResponse } from "next/server";
import {
  generatePerformanceData,
  generateCostImpactEvents,
  computeSummary,
  type TimeRange,
} from "@/lib/performance/data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get("range") ?? "1y") as TimeRange;
  const propertyId = searchParams.get("propertyId") ?? undefined;

  const validRanges: TimeRange[] = ["7d", "30d", "90d", "1y", "2y", "5y", "7y"];
  if (!validRanges.includes(range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  // Generate current period data
  const data = generatePerformanceData(range, propertyId);

  // Generate prior period (same length) for comparison
  const prevData = generatePerformanceData(range === "7d" ? "7d" : range === "30d" ? "30d" : range === "90d" ? "90d" : range === "1y" ? "1y" : range === "2y" ? "2y" : range === "5y" ? "5y" : "7y");

  const summary = computeSummary(data, prevData.slice(0, Math.floor(prevData.length / 2)));
  const costEvents = generateCostImpactEvents(range);

  // AI narrative — call Anthropic API if key is available
  let aiNarrative: string | null = null;

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const prompt = `You are a property management financial analyst. Write a concise 3-paragraph performance narrative for this portfolio overview.

Time range: ${range}
Summary:
- Total Revenue: $${summary.totalRevenue.toLocaleString()}
- Total Expenses: $${summary.totalExpenses.toLocaleString()}  
- Net Operating Income: $${summary.totalNOI.toLocaleString()}
- NOI Margin: ${summary.noiMargin}%
- Avg Occupancy: ${summary.avgOccupancyRate}%
- Revenue Growth vs Prior Period: ${summary.revenueGrowth > 0 ? "+" : ""}${summary.revenueGrowth}%
- Top Cost Driver: ${summary.topCostDriver}
- Vacancy Loss: $${summary.totalVacancyLoss.toLocaleString()}
- Capital Expenditure: $${summary.totalCapex.toLocaleString()}
- Occupancy Change: ${summary.occupancyDelta > 0 ? "+" : ""}${summary.occupancyDelta}%

Key cost events during this period:
${costEvents.slice(0, 5).map((e) => `- ${e.title}: $${e.amount.toLocaleString()} (${e.impact})`).join("\n")}

Paragraph 1: Overall portfolio performance and financial health.
Paragraph 2: Key cost drivers and what impacted NOI the most.
Paragraph 3: Specific actionable recommendations to improve performance.

Be specific with dollar amounts. Identify patterns. Flag risks. Keep it professional and concise.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (response.ok) {
        const aiData = await response.json();
        aiNarrative = aiData.content?.[0]?.text ?? null;
      }
    } catch {
      // Silently fall back to template narrative
    }
  }

  // Template narrative fallback (used when no API key)
  if (!aiNarrative) {
    const trend = summary.revenueGrowth > 0 ? "up" : "down";
    const occupancyStatus = summary.avgOccupancyRate >= 85 ? "strong" : summary.avgOccupancyRate >= 78 ? "moderate" : "below target";
    aiNarrative = `Portfolio revenue is ${trend} ${Math.abs(summary.revenueGrowth)}% versus the prior period, with total collections of $${summary.totalRevenue.toLocaleString()} and a net operating income of $${summary.totalNOI.toLocaleString()} (${summary.noiMargin}% NOI margin). Occupancy averaged ${summary.avgOccupancyRate}% — ${occupancyStatus} — with a ${summary.occupancyDelta > 0 ? "+" : ""}${summary.occupancyDelta}% shift from the prior period.

The top cost driver this period was ${summary.topCostDriver} at $${(summary.topCostDriver === "Maintenance" ? summary.totalMaintenanceCost : summary.topCostDriver === "Vacancy Loss" ? summary.totalVacancyLoss : summary.totalCapex).toLocaleString()}. Vacancy loss alone represents $${summary.totalVacancyLoss.toLocaleString()} in unrealized revenue. ${costEvents.filter((e) => e.impact === "negative").length > 0 ? `Key negative events include: ${costEvents.filter((e) => e.impact === "negative").slice(0, 2).map((e) => e.title).join(", ")}.` : "No major adverse events recorded this period."}

Recommended actions: ${summary.avgOccupancyRate < 85 ? "Prioritize leasing activity to close the vacancy gap — each percentage point of occupancy represents approximately $2,800/month in revenue. " : ""}${summary.totalMaintenanceCost > summary.totalRevenue * 0.15 ? "Maintenance costs are running above the 15% threshold — review deferred work orders and consider a preventive maintenance schedule to reduce emergency call-outs. " : ""}${costEvents.some((e) => e.category === "compliance") ? "Address outstanding compliance items promptly to avoid escalating fines and regulatory risk." : "Compliance posture is current — maintain scheduled inspection cadence."}`;
  }

  return NextResponse.json({
    range,
    data,
    summary,
    costEvents,
    aiNarrative,
    generatedAt: new Date().toISOString(),
  });
}
