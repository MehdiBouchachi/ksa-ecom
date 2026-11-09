import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema";

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;
export type Tx = PgTransaction<NodePgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type Executor = Db | Tx;

/**
 * TLS policy for the external managed PostgreSQL (NOT Supabase, NOT on Hostinger Business).
 * DATABASE_SSL: "verify-full" (default in production) | "require" | "disable" (local/test only).
 * DATABASE_CA_CERT: optional PEM of the provider CA (newline-escaped allowed).
 * We never default to rejectUnauthorized:false.
 */
export function sslConfig(env = process.env): pg.PoolConfig["ssl"] {
  const mode = env.DATABASE_SSL ?? (env.NODE_ENV === "production" ? "verify-full" : "disable");
  if (mode === "disable") {
    if (env.NODE_ENV === "production" && env.ALLOW_INSECURE_DB !== "1") {
      throw new Error("DATABASE_SSL=disable is not allowed in production");
    }
    return false;
  }
  const ca = env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  if (mode === "require") {
    // Encrypted; certificate still verified against system CAs (or provided CA).
    return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true };
  }
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true };
}

type Holder = { pool?: pg.Pool; db?: Db };
const g = globalThis as unknown as { __saudiEcomDb?: Holder };
const holder: Holder = (g.__saudiEcomDb ??= {});

export function createPool(url: string, max?: number): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    ssl: sslConfig(),
    // Small bounded pool: Hostinger runs a single Node process and managed PG has connection limits.
    max: max ?? Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 15_000),
    application_name: "saudi-ecom-web",
  });
}

export function getPool(): pg.Pool {
  if (!holder.pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not configured");
    holder.pool = createPool(url);
    holder.pool.on("error", (err) => console.error("[db] idle client error", err.message));
  }
  return holder.pool;
}

export function getDb(): Db {
  if (!holder.db) holder.db = drizzle(getPool(), { schema });
  return holder.db;
}

/** For tests / scripts. */
export async function closeDb(): Promise<void> {
  const p = holder.pool;
  holder.pool = undefined;
  holder.db = undefined;
  if (p) await p.end();
}

export function pgErrorCode(e: unknown): string | undefined {
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

export function pgConstraint(e: unknown): string | undefined {
  let cur: unknown = e;
  for (let i = 0; i < 4 && cur; i++) {
    const c = (cur as { constraint?: unknown }).constraint;
    if (typeof c === "string") return c;
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

const RETRYABLE = new Set(["40P01", "40001"]); // deadlock_detected, serialization_failure

/**
 * Runs fn in a PostgreSQL transaction (READ COMMITTED) on one pooled connection.
 * Retries a bounded number of times on deadlock/serialization failures only.
 * Never call external HTTP providers inside fn.
 */
export async function withTx<T>(fn: (tx: Tx) => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await getDb().transaction(fn);
    } catch (e) {
      lastErr = e;
      const code = pgErrorCode(e);
      if (!code || !RETRYABLE.has(code) || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 20 * 2 ** i + Math.floor(Math.random() * 20)));
    }
  }
  throw lastErr;
}

export { schema };
