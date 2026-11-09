/**
 * First-boot ADMIN for the Docker image (idempotent; never resets an existing account).
 * - If any ADMIN exists: does nothing.
 * - Otherwise creates ADMIN_EMAIL (default admin@example.com) with ADMIN_PASSWORD, or a random
 *   password that is printed once to the container log and written to ADMIN_PASSWORD_FILE (0600).
 * Change the password after the first login (Account → Profile).
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { email, password, personName } from "@saudi-ecom/contracts";
import { hashPassword } from "../src/server/auth/password";
import { closeDb, getDb } from "../src/server/db";
import { auditLogs, users } from "../src/server/db/schema";

const [admin] = await getDb().select({ id: users.id }).from(users).where(eq(users.role, "ADMIN")).limit(1);
if (admin) {
  console.log("[bootstrap-admin] an ADMIN already exists; nothing to do");
} else {
  const e = email.parse(process.env.ADMIN_EMAIL || "admin@example.com");
  const n = personName.parse(process.env.ADMIN_NAME || "Admin");
  const generated = !process.env.ADMIN_PASSWORD;
  const p = password.parse(process.env.ADMIN_PASSWORD || randomBytes(18).toString("base64url"));

  const [u] = await getDb().insert(users).values({ email: e, fullName: n, role: "ADMIN", passwordHash: await hashPassword(p) }).returning({ id: users.id });
  await getDb().insert(auditLogs).values({ action: "team.bootstrap_admin", entity: "user", entityId: u!.id, data: {} });

  if (generated) {
    const file = process.env.ADMIN_PASSWORD_FILE;
    if (file) fs.writeFileSync(file, `${e}\n${p}\n`, { mode: 0o600 });
    console.log(
      ["", "==================== ADMIN ACCOUNT (first boot) ====================", `  email:    ${e}`, `  password: ${p}`, "  Change it after your first login. Shown once.", "====================================================================", ""].join("\n"),
    );
  } else {
    console.log(`[bootstrap-admin] ADMIN ${e} created`);
  }
}
await closeDb();
