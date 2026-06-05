import { NextResponse } from "next/server";

export { GET } from "@/app/api/_implementations/audit-log.route";
export async function POST() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
