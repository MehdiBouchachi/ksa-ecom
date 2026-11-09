import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacHex(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/** Header format: "t=<unix seconds>,v1=<hex hmac of `${t}.${payload}`>" */
export function signPayload(secret: string, payload: string, now = Date.now()): string {
  const t = Math.floor(now / 1000);
  return `t=${t},v1=${hmacHex(secret, `${t}.${payload}`)}`;
}

export function verifySignedPayload(secret: string, payload: string, header: string | null, toleranceSec = 300, now = Date.now()): boolean {
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(Math.floor(now / 1000) - t) > toleranceSec) return false;
  return safeEqualHex(hmacHex(secret, `${t}.${payload}`), v1);
}
