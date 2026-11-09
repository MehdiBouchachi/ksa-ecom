import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { AppError } from "./errors";

/**
 * Fixed-window rate limiter backed by PostgreSQL (atomic upsert; no Redis on managed hosting).
 * Returns remaining allowance; throws RATE_LIMITED when exceeded.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<number> {
  const res = await getDb().execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, now(), 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start < now() - make_interval(secs => ${windowSec}) then now() else rate_limits.window_start end
    returning count`);
  const count = Number(res.rows[0]?.count ?? 0);
  if (count > limit) throw new AppError("RATE_LIMITED", "محاولات كثيرة، يرجى المحاولة لاحقًا");
  return limit - count;
}

export async function resetRateLimit(key: string) {
  await getDb().execute(sql`delete from rate_limits where key = ${key}`);
}

export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  return (xff?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown").slice(0, 64);
}
