import { NextResponse } from "next/server";
import { errorResponse } from "@/server/lib/http";
import { handlePaymentWebhook } from "@/server/payments/service";

/** PSP webhook. Raw body is verified (signature) before any parsing or DB work. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 256_000) return NextResponse.json({ error: { code: "VALIDATION_FAILED", message: "payload too large", requestId: "-" } }, { status: 413 });
  try {
    const outcome = await handlePaymentWebhook(raw, req.headers);
    return NextResponse.json({ data: { received: true, outcome } });
  } catch (e) {
    return errorResponse(e);
  }
}
