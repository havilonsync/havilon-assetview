# Havilon AssetView™

Enterprise Asset Lifecycle Management Platform — Next.js 16 + TypeScript + Tailwind CSS

## Quick Start

```bash
npm install
cp .env.example .env
# Set DATABASE_URL in .env for PostgreSQL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Modules (16 total)

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/dashboard` | Portfolio KPIs, health metrics, activity feed |
| CRM | `/crm` | Leads, proposals, contracts, referrals |
| Client Onboarding | `/onboarding` | 7-step wizard, document collection, receipts |
| Asset Lifecycle | `/assets` | Full asset history, acquisition records, events |
| Properties & Units | `/properties` | Buildings, units, tenants, leases |
| Maintenance | `/maintenance` | Work orders, capital projects, vendors, bids |
| Insurance | `/insurance` | Policies, claims, renewals, documentation |
| Compliance | `/compliance` | Deadlines, filings, legal holds, evictions |
| Communications | `/communications` | Email, SMS, notices, approval queue |
| Revenue Operations | `/revenue` | Invoicing, pricing engine, reconciliation |
| Trust Accounting | `/trust` | Owner funds, reserves, statements, disbursements |
| Audit Portal | `/audit` | Read-only access, engagement letters, packets |
| Workflow Engine | `/workflow` | Configurable workflows, automation |
| AI Layer | `/ai` | Summaries, anomaly detection, search, reports |
| Receipts & CoC | `/receipts` | Immutable receipts, SHA-256 chain of custody |
| Closeout & Archive | `/closeout` | Final reports, data export, business continuity |
| SaaS Admin | `/saas` | Multi-company, MFA, roles, audit logs |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM (schema in `prisma/schema.prisma`)
- **Icons**: Lucide React
- **Auth**: NextAuth (credentials/JWT session) + role-based middleware

## Production Setup

1. Provision PostgreSQL
2. Set `DATABASE_URL` in `.env`
3. Run `npx prisma migrate dev` to create tables
4. Run `npx prisma generate` (Prisma Client is generated to `src/generated/prisma`)
5. Authentication middleware is already active in `middleware.ts`
6. Replace remaining `src/lib/store.ts` imports in dashboard pages with Prisma-backed data fetches

## Architecture

```
src/
├── app/
│   ├── (dashboard)/     # All 16 module pages
│   │   ├── dashboard/
│   │   ├── crm/
│   │   ├── ...
│   ├── api/             # REST API routes
│   └── layout.tsx
├── components/
│   ├── layout/          # Sidebar navigation
│   └── ui/              # Shared component library
├── lib/
│   ├── store.ts         # In-memory data store (replace with Prisma)
│   └── utils.ts         # Helpers: formatCurrency, formatDate, etc.
prisma/
└── schema.prisma        # Complete database schema (all 30+ models)
```

## Performance Overview Module

### Features
- **7 time ranges:** 7 days, 30 days, 90 days, 1 year, 2 years, 5 years, 7 years
- **4 chart views:** NOI trend, Revenue vs Expenses, Occupancy Rate, Expense Breakdown
- **AI narrative:** Powered by Anthropic claude-sonnet-4 — auto-generates 3-paragraph analysis of portfolio health, cost drivers, and recommendations
- **Cost Impact Events:** Categorized timeline of events (maintenance, vacancy, insurance, legal, CapEx, late payments, compliance) with positive/negative/neutral impact tagging
- **Period-by-period table:** Full breakdown per period with color-coded NOI margin and occupancy
- **KPI strip:** Revenue, NOI, Expenses, Occupancy, Vacancy Loss, CapEx — each with delta vs prior period

### Production setup
The API route (`/api/performance`) currently uses generated time-series data.  
In production, replace with Prisma aggregate queries against `PerformanceSnapshot`:

```typescript
// Example production query
const data = await prisma.performanceSnapshot.groupBy({
  by: ["period"],
  where: { companyId, granularity, period: { gte: startDate } },
  _sum: { revenue: true, expenses: true, noi: true, ... },
  orderBy: { period: "asc" },
});
```

Snapshots are written nightly by a cron job that aggregates:
- `RentPayment` records → revenue
- `WorkOrder.actualCost` + `CapitalProject.spent` → expenses
- `Lease.status` counts → occupancy rate
- `TrustTransaction` records → trust movement

### AI narrative
Set `ANTHROPIC_API_KEY` in `.env` to activate live AI summaries.
Falls back to a template-generated narrative when no key is present.
