import { NextResponse } from "next/server";

export { GET, POST } from "@/app/api/_implementations/communications.route";
export async function PATCH() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
