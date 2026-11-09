// Scheduler sidecar: calls the signed maintenance endpoints (same contract as scripts/cron.sh).
// Signature: x-cron-signature: t=<unix>,v1=HMAC_SHA256(CRON_SECRET, "<t>.<path>")
import crypto from "node:crypto";
import fs from "node:fs";

const base = (process.env.CRON_TARGET || "http://app:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET || fs.readFileSync(process.env.CRON_SECRET_FILE || "/run/app-secrets/cron_secret", "utf8").trim();
const jobs = [
  { name: "outbox", everyMin: Number(process.env.CRON_OUTBOX_MIN || 2) },
  { name: "reconcile", everyMin: Number(process.env.CRON_RECONCILE_MIN || 5) },
  { name: "shipping-sync", everyMin: Number(process.env.CRON_SHIPPING_MIN || 30) },
];

async function run(job) {
  const p = `/api/v1/cron/${job}`;
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${p}`).digest("hex");
  try {
    const res = await fetch(base + p, { method: "POST", headers: { "x-cron-signature": `t=${t},v1=${v1}` }, signal: AbortSignal.timeout(55_000) });
    const body = await res.text();
    console.log(JSON.stringify({ at: new Date().toISOString(), job, status: res.status, body: body.slice(0, 300) }));
  } catch (e) {
    console.log(JSON.stringify({ at: new Date().toISOString(), job, error: String(e?.message || e) }));
  }
}

let minute = 0;
const running = new Set();
async function tick() {
  for (const j of jobs) {
    if (minute % j.everyMin !== 0 || running.has(j.name)) continue; // never overlap the same job
    running.add(j.name);
    run(j.name).finally(() => running.delete(j.name));
  }
  minute++;
}
console.log(`[cron] scheduling ${jobs.map((j) => `${j.name}/${j.everyMin}m`).join(", ")} → ${base}`);
setTimeout(() => { tick(); setInterval(tick, 60_000); }, 20_000); // let the app finish booting first
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => process.exit(0));
