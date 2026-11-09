import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, isAppError } from "./errors";
import { verifySignedPayload } from "./hmac";
import { log } from "./log";

export function ok<T>(data: T, init?: { status?: number; meta?: unknown; headers?: HeadersInit }) {
  const body = init?.meta === undefined ? { data } : { data, meta: init.meta };
  return NextResponse.json(body, { status: init?.status ?? 200, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}

export function errorResponse(e: unknown, requestId = randomUUID()) {
  if (isAppError(e)) {
    return NextResponse.json(
      { error: { code: e.code, message: e.message, requestId, ...(e.details !== undefined && e.status < 500 ? { details: e.details } : {}) } },
      { status: e.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_FAILED", message: "بيانات غير صالحة", requestId, details: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } },
      { status: 422 },
    );
  }
  log.error("http.unhandled", { requestId, err: (e as Error)?.message, stack: (e as Error)?.stack?.split("\n").slice(0, 4).join(" | ") });
  return NextResponse.json({ error: { code: "INTERNAL", message: "حدث خطأ غير متوقع", requestId } }, { status: 500 });
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a Route Handler: uniform error envelope, never leaks internals or secrets. */
export function route<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("VALIDATION_FAILED", "JSON غير صالح");
  }
  return schema.parse(body);
}

/**
 * CSRF/origin protection for cookie-authenticated browser mutations on Route Handlers.
 * (Server Actions already enforce same-origin in Next.js.)
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = new URL(process.env.APP_URL ?? "http://localhost:3000").origin;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin) throw new AppError("FORBIDDEN", "طلب غير مسموح (origin)");
  const o = new URL(origin);
  if (o.origin !== allowed && o.host !== host) throw new AppError("FORBIDDEN", "طلب غير مسموح (origin)");
}

/**
 * Signed cron: header `x-cron-signature: t=<unix>,v1=hmac_sha256(CRON_SECRET, "<t>.<pathname>")`.
 * 5-minute replay window. See scripts/cron.sh.
 */
export function assertCronSignature(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) throw new AppError("NOT_CONFIGURED", "CRON_SECRET not configured");
  const path = new URL(req.url).pathname;
  if (!verifySignedPayload(secret, path, req.headers.get("x-cron-signature"))) {
    log.warn("cron.rejected", { path });
    throw new AppError("FORBIDDEN", "invalid cron signature");
  }
}
