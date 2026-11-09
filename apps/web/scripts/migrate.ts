/**
 * Controlled migration job. Run from CI/CLI (never on a page request):
 *   DATABASE_URL=... pnpm db:migrate
 */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { closeDb, getDb } from "../src/server/db";

const here = path.dirname(fileURLToPath(import.meta.url));
const folder = path.resolve(here, "../drizzle");

await migrate(getDb(), { migrationsFolder: folder });
console.log("[migrate] done");
await closeDb();
