import { NextResponse } from "next/server";
import { getPool } from "@/server/db";

/** Liveness + DB readiness for container healthchecks / uptime monitors. Exposes no details. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getPool().query("select 1");
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
