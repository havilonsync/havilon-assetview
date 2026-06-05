import { NextResponse } from "next/server";
// Real implementation: src/app/api/_implementations/upload.route.ts
// Handles S3 pre-signed URLs, document records, chain-of-custody receipts
export async function POST() { return NextResponse.json({ status: "scaffold", note: "Connect DB to activate" }, { status: 501 }); }
export async function PATCH() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
