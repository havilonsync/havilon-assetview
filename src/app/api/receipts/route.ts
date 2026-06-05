import { NextResponse } from "next/server";
// Real implementation: src/app/api/_implementations/receipts.route.ts
// Activate after: npx prisma generate && npx prisma migrate dev
export async function GET() { return NextResponse.json({ status: "scaffold", module: "receipts", note: "Connect DB and run prisma generate to activate real implementation" }); }
export async function POST() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
