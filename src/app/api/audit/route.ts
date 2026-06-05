import { NextResponse } from "next/server";
// Real implementation: src/app/api/_implementations/audit.route.ts
// Activate after: npx prisma generate && npx prisma migrate dev
export async function GET() { return NextResponse.json({ status: "scaffold", module: "audit", note: "Connect DB and run prisma generate to activate real implementation" }); }
export async function POST() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
