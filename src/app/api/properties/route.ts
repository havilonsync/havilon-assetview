import { NextResponse } from "next/server";
// Real implementation: src/app/api/_implementations/properties.route.ts
// Activate after: npx prisma generate && npx prisma migrate dev
export async function GET() { return NextResponse.json({ status: "scaffold", module: "properties" }); }
export async function POST() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
export async function PATCH() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
