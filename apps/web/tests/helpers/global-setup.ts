/**
 * Starts a REAL PostgreSQL for integration tests:
 *  - TEST_DATABASE_URL set (CI service container / local Docker) => use it;
 *  - otherwise boot an embedded PostgreSQL binary (npm `embedded-postgres`) on a free port.
 * Then applies the committed Drizzle migrations (same files as production).
 */
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { TestProject } from "vitest/node";

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(port));
    });
    s.on("error", reject);
  });
}

export default async function setup(project: TestProject) {
  let url = process.env.TEST_DATABASE_URL;
  let stop: (() => Promise<void>) | undefined;
  if (!url) {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    const port = await freePort();
    const dir = path.resolve(import.meta.dirname, `../../.pg-test-data-${port}`);
    fs.rmSync(dir, { recursive: true, force: true });
    const pgServer = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port, persistent: false, createPostgresUser: true, onLog: () => {} });
    await pgServer.initialise();
    await pgServer.start();
    await pgServer.createDatabase("saudi_ecom_test");
    url = `postgres://postgres:postgres@127.0.0.1:${port}/saudi_ecom_test`;
    stop = async () => {
      await pgServer.stop();
      fs.rmSync(dir, { recursive: true, force: true });
    };
  }
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  await migrate(drizzle(pool), { migrationsFolder: path.resolve(import.meta.dirname, "../../drizzle") });
  await pool.end();
  project.provide("databaseUrl", url);
  return async () => {
    await stop?.();
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
