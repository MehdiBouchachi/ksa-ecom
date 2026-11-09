// One-shot (compose "secrets" service): creates random secrets on first boot in a private volume.
// Never overwrites an existing value, so restarts and rebuilds keep sessions and the DB password.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dir = process.env.SECRETS_DIR || "/run/app-secrets";
const secrets = {
  db_password: 0o444, // read by the postgres container (different uid)
  auth_secret: 0o400,
  cron_secret: 0o400,
  payment_webhook_secret: 0o400,
};

for (const [name, mode] of Object.entries(secrets)) {
  const file = path.join(dir, name);
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8").trim().length >= 32) continue;
  fs.writeFileSync(file, crypto.randomBytes(32).toString("hex"), { mode });
  console.log(`[secrets] generated ${name}`);
}
console.log("[secrets] ready");
