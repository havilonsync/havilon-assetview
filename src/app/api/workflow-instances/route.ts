import { NextResponse } from "next/server";

export { GET, POST } from "@/app/api/_implementations/workflow-instances.route";
export async function PATCH() { return NextResponse.json({ status: "scaffold" }, { status: 501 }); }
