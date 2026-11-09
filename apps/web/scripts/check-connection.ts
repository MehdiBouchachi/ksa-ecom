/**
 * Connectivity proof for the EXTERNAL managed PostgreSQL (run from the Hostinger app shell/SSH
 * and from CI). Reports TLS, server version, latency, extension availability and connection limit.
 */
import { closeDb, getPool, sslConfig } from "../src/server/db";

const pool = getPool();
const t0 = Date.now();
const c = await pool.connect();
try {
  const connectMs = Date.now() - t0;
  const q = async <T>(s: string) => (await c.query(s)).rows[0] as T;
  const v = await q<{ server_version: string }>("show server_version");
  const ssl = await q<{ ssl: boolean | null }>("select ssl from pg_stat_ssl where pid = pg_backend_pid()").catch(() => ({ ssl: null }));
  const maxc = await q<{ max_connections: string }>("show max_connections");
  const gist = await q<{ ok: boolean }>("select exists(select 1 from pg_available_extensions where name='btree_gist') as ok");
  const t1 = Date.now();
  for (let i = 0; i < 5; i++) await c.query("select 1");
  const rtt = (Date.now() - t1) / 5;
  console.log(JSON.stringify({ ok: true, serverVersion: v.server_version, tls: ssl.ssl, tlsConfig: sslConfig() ? "verify" : "disabled", maxConnections: Number(maxc.max_connections), btreeGistAvailable: gist.ok, connectMs, avgRoundTripMs: rtt }, null, 2));
  if (process.env.NODE_ENV === "production" && ssl.ssl !== true) {
    console.error("FAIL: connection is not TLS-encrypted");
    process.exitCode = 1;
  }
} finally {
  c.release();
  await closeDb();
}
