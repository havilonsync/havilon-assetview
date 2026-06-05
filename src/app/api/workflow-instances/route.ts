import { NextResponse } from "next/server";
// Real implementation: src/app/api/_implementations/workflow-instances.route.ts
// Activate after: npx prisma generate && npx prisma migrate dev
export async function GET() { return NextResponse.json({ status: "scaffold", module: "workflow-instances" }); }
export async function POST() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
export async function PATCH() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
