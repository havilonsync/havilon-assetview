import { NextResponse } from "next/server";

export { POST } from "@/app/api/_implementations/upload.route";
export async function PATCH() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
