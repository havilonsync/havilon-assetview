import { NextRequest, NextResponse } from "next/server";

export { GET, DELETE } from "@/app/api/_implementations/leads.id.route";

type RouteParams = { params: Promise<{ id: string }> };
export async function PATCH(_: NextRequest, { params }: RouteParams) {
	const { id } = await params;
	return NextResponse.json({ status: "scaffold", id }, { status: 501 });
}
