import { NextResponse } from "next/server";

export async function GET() { return NextResponse.json({ status: "scaffold", module: "password-reset" }); }
export { POST } from "@/app/api/_implementations/password-reset.route";
export async function PATCH() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
