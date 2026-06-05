import { NextRequest, NextResponse } from "next/server";
type RouteParams = { params: Promise<{ id: string }> };
// Real implementation: src/app/api/_implementations/leads.id.route.ts
export async function GET(_: NextRequest, { params }: RouteParams) { const { id } = await params; return NextResponse.json({ status: "scaffold", id }); }
export async function PATCH(_: NextRequest, { params }: RouteParams) { const { id } = await params; return NextResponse.json({ status: "scaffold", id }, { status: 501 }); }
export async function DELETE(_: NextRequest, { params }: RouteParams) { const { id } = await params; return new NextResponse(null, { status: 501 }); }
