/**
 * Bootstrap the first ADMIN account (there is no public way to create staff).
 *   ADMIN_EMAIL=owner@example.com ADMIN_NAME="Owner" ADMIN_PASSWORD='…' pnpm db:create-admin
 */
import { eq, sql } from "drizzle-orm";
import { email, password, personName } from "@saudi-ecom/contracts";
import { hashPassword } from "../src/server/auth/password";
import { closeDb, getDb } from "../src/server/db";
import { auditLogs, users } from "../src/server/db/schema";

const e = email.parse(process.env.ADMIN_EMAIL);
const n = personName.parse(process.env.ADMIN_NAME ?? "Admin");
const p = password.parse(process.env.ADMIN_PASSWORD);

const [existing] = await getDb().select().from(users).where(sql`lower(${users.email}) = ${e}`);
if (existing) {
  await getDb().update(users).set({ role: "ADMIN", status: "ACTIVE", passwordHash: await hashPassword(p), sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, existing.id));
  console.log("[create-admin] existing user promoted to ADMIN and password reset");
} else {
  const [u] = await getDb().insert(users).values({ email: e, fullName: n, role: "ADMIN", passwordHash: await hashPassword(p) }).returning({ id: users.id });
  await getDb().insert(auditLogs).values({ action: "team.bootstrap_admin", entity: "user", entityId: u!.id, data: {} });
  console.log("[create-admin] ADMIN created");
}
await closeDb();
