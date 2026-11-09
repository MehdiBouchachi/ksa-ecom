/**
 * End-to-end smoke test against the PRODUCTION build (`next build` first).
 * Boots a real PostgreSQL (TEST_DATABASE_URL or embedded), migrates, seeds DEMO data, creates
 * an Admin and a Manager, starts `next start`, then drives Chromium through:
 *   ACC-01/02/03 browse · ACC-05 register → cart → checkout → sandbox PSP → verified PAID
 *   ACC-11 Manager blocked from /admin/customers & /admin/team · ACC-19 no horizontal overflow
 * Usage: pnpm build && pnpm test:e2e   (screenshots → test-results/e2e)
 */
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { chromium, type Page } from "playwright";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "test-results/e2e");
fs.mkdirSync(out, { recursive: true });

const freePort = () =>
  new Promise<number>((res) => {
    const s = net.createServer();
    s.listen(0, () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => res(p));
    });
  });

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

let pgStop: (() => Promise<void>) | undefined;
let server: ChildProcess | undefined;

async function main() {
  let dbUrl = process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    const { default: EmbeddedPostgres } = await import("embedded-postgres");
    const port = await freePort();
    const dir = path.join(root, `.pg-test-data-e2e-${port}`);
    const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port, persistent: false, createPostgresUser: true, onLog: () => {} });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase("e2e");
    dbUrl = `postgres://postgres:postgres@127.0.0.1:${port}/e2e`;
    pgStop = async () => {
      await pg.stop();
      fs.rmSync(dir, { recursive: true, force: true });
    };
  }
  const appPort = await freePort();
  const appUrl = `http://localhost:${appPort}`;
  const env = {
    ...process.env,
    DATABASE_URL: dbUrl,
    DATABASE_SSL: "disable",
    ALLOW_INSECURE_DB: "1",
    APP_URL: appUrl,
    AUTH_URL: appUrl,
    AUTH_SECRET: "e2e-auth-secret-0123456789abcdef0123456789abcdef",
    AUTH_TRUST_HOST: "true",
    PAYMENT_PROVIDER: "mock",
    ALLOW_MOCK_PAYMENTS: "1",
    ALLOW_MOCK_SHIPPING: "1",
    PAYMENT_WEBHOOK_SECRET: "e2e-webhook-secret-0123456789",
    CRON_SECRET: "e2e-cron-secret-0123456789abcdef0123456789",
    BCRYPT_COST: "8",
    LOG_SILENT: "1",
  };
  const run = (script: string, extra: Record<string, string> = {}) =>
    execFileSync(process.execPath, ["--import", "tsx", script], { cwd: root, env: { ...env, NODE_ENV: "development", ...extra }, stdio: "inherit" });
  run("scripts/migrate.ts");
  run("scripts/seed-demo.ts");
  run("scripts/create-admin.ts", { ADMIN_EMAIL: "admin@e2e.test", ADMIN_NAME: "مدير عام", ADMIN_PASSWORD: "AdminPass-12345" });
  run("scripts/create-admin.ts", { ADMIN_EMAIL: "manager@e2e.test", ADMIN_NAME: "مدير عمليات", ADMIN_PASSWORD: "ManagerPass-12345" });
  // Demote the second account to MANAGER through SQL (the UI path is covered by integration tests).
  const pgMod = await import("pg");
  const c = new pgMod.default.Client({ connectionString: dbUrl });
  await c.connect();
  await c.query("update users set role='MANAGER' where email='manager@e2e.test'");
  await c.end();

  server = spawn(path.join(root, "node_modules/.bin/next"), ["start", "-p", String(appPort)], { cwd: root, env: { ...env, NODE_ENV: "production" }, stdio: ["ignore", "pipe", "pipe"] });
  let serverLog = "";
  server.stdout!.on("data", (d) => (serverLog += d));
  server.stderr!.on("data", (d) => (serverLog += d));
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(appUrl + "/robots.txt")).ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ locale: "ar-SA", viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    console.log("ACC-01 home");
    await page.goto(appUrl + "/");
    assert((await page.getAttribute("html", "dir")) === "rtl" && (await page.getAttribute("html", "lang")) === "ar", "html is lang=ar dir=rtl");
    assert(await page.locator("h1").first().isVisible(), "home has an h1");
    await page.screenshot({ path: path.join(out, "home-390.png"), fullPage: true });

    console.log("ACC-02 listing + filters");
    await page.goto(appUrl + "/products?color=black&inStock=1&sort=price_asc");
    assert((await page.locator("ul li article").count()) === 1, "color filter yields the black card only");
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    assert(robots?.includes("noindex"), "faceted listing is noindex");
    await page.goto(appUrl + "/products");
    assert((await page.locator("ul li article").count()) === 3, "listing shows 3 real color cards for the one product family");
    assert((await page.locator('link[rel="canonical"]').getAttribute("href"))?.endsWith("/products"), "canonical on listing");

    console.log("ACC-03 product detail");
    await page.goto(appUrl + "/products/demo-tshirt?color=white");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    assert(ld.some((t) => t.includes('"@type":"Product"') && t.includes('"priceCurrency":"SAR"')), "Product JSON-LD with SAR offers");
    await page.getByText("M", { exact: true }).click();
    assert(await page.getByText("SKU: DEMO-WHITE-M").isVisible(), "color+size resolves the exact SKU");
    await page.getByText("جملة", { exact: true }).click();
    await page.locator("#qty").fill("5");
    assert(await page.getByText("الحد الأدنى لطلب الجملة 12 قطعة").isVisible(), "bulk MOQ shown and enforced in UI");
    await page.locator("#qty").fill("48");
    assert(await page.getByText(/59[.,٫]00/).first().isVisible(), "bulk tier price for 48+ displayed");
    await page.getByText("تجزئة", { exact: true }).click();
    await page.locator("#qty").fill("2");
    await page.getByRole("button", { name: "أضف إلى السلة" }).click();
    await page.screenshot({ path: path.join(out, "product-390.png"), fullPage: true });

    console.log("ACC-05 register → checkout → sandbox PSP → verified paid");
    await page.goto(appUrl + "/auth/register?next=/checkout");
    await page.fill("#a-name", "سارة الاختبار");
    await page.fill("#a-email", "sara@e2e.test");
    await page.fill("#a-phone", "0501234567");
    await page.fill("#a-password", "CustomerPass-123");
    await page.locator('input[name="privacy"]').check();
    await page.getByRole("button", { name: "إنشاء الحساب" }).click();
    await page.waitForURL("**/checkout");
    await page.fill("#co-city", "الرياض");
    await page.fill("#co-district", "العليا");
    await page.fill("#co-street", "طريق الملك فهد");
    await page.fill("#co-building", "1234");
    await page.fill("#co-postalCode", "12211");
    await page.locator("#co-terms").check();
    await page.getByText(/الإجمالي/).last().waitFor();
    await page.screenshot({ path: path.join(out, "checkout-390.png"), fullPage: true });
    await assertNoOverflow(page, "checkout @390");
    await page.getByRole("button", { name: "المتابعة إلى الدفع" }).click();
    await page.waitForURL("**/checkout/mock-pay/**");
    await page.getByRole("button", { name: "محاكاة دفع ناجح" }).click();
    await page.waitForURL("**/checkout/result**");
    assert(await page.getByRole("heading", { name: "تم تأكيد الدفع، شكرًا لك!" }).isVisible(), "result page shows server-verified PAID");
    await page.goto(appUrl + "/account/orders");
    assert(await page.getByText("الدفع: مدفوع").first().isVisible(), "own order list shows independent statuses");
    await page.screenshot({ path: path.join(out, "orders-390.png"), fullPage: true });

    console.log("ACC-19 responsive: no horizontal overflow");
    for (const w of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width: w, height: 900 });
      for (const p of ["/", "/products", "/products/demo-tshirt", "/cart", "/account/orders"]) {
        await page.goto(appUrl + p);
        await assertNoOverflow(page, `${p} @${w}`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(appUrl + "/products/demo-tshirt");
    await page.screenshot({ path: path.join(out, "product-1440.png") });

    console.log("ACC-11 Manager vs Admin");
    const m = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await login(m, appUrl, "manager@e2e.test", "ManagerPass-12345", "/admin");
    assert(await m.getByRole("heading", { name: "نظرة عامة" }).isVisible(), "manager reaches dashboard");
    assert((await m.getByRole("link", { name: "العملاء" }).count()) === 0, "customers link hidden for manager");
    for (const p of ["/admin/customers", "/admin/team"]) {
      await m.goto(appUrl + p);
      assert(await m.getByRole("heading", { name: "غير مصرح أو حدث خطأ" }).isVisible(), `manager blocked from ${p} by URL`);
      const api = await m.request.get(appUrl + "/api/v1" + p);
      assert(api.status() === 403, `manager gets 403 from /api/v1${p}`);
    }
    await m.goto(appUrl + "/admin/orders");
    await m.locator("table a").first().click();
    await m.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}/);
    assert(await m.getByRole("heading", { name: "بيانات التوصيل (لهذا الطلب فقط)" }).isVisible(), "manager sees delivery details inside the order");
    await m.getByRole("button", { name: "إنشاء شحنة أرامكس" }).click();
    await m.waitForURL(/ok=/);
    assert(await m.getByRole("status").filter({ hasText: "تم إنشاء الشحنة" }).isVisible(), "manager creates the Aramex shipment (sandbox)");
    await m.screenshot({ path: path.join(out, "admin-order-1280.png"), fullPage: true });

    const a = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await login(a, appUrl, "admin@e2e.test", "AdminPass-12345", "/admin/customers");
    assert(await a.getByRole("cell", { name: "sara@e2e.test" }).isVisible(), "admin sees the customer directory");
    await a.screenshot({ path: path.join(out, "admin-customers-1280.png") });

    assert(errors.length === 0, `no uncaught browser errors (${errors.join(" | ")})`);
    console.log("\nE2E SMOKE PASSED");
  } catch (e) {
    console.error(serverLog.split("\n").slice(-40).join("\n"));
    throw e;
  } finally {
    await browser.close();
  }
}

async function assertNoOverflow(page: Page, label: string) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sw > cw + 1) throw new Error(`horizontal overflow on ${label}: ${sw} > ${cw}`);
}

async function login(p: Page, appUrl: string, email: string, password: string, next: string) {
  await p.goto(`${appUrl}/auth/login?next=${encodeURIComponent(next)}`);
  await p.fill("#a-email", email);
  await p.fill("#a-password", password);
  await p.getByRole("button", { name: "دخول" }).click();
  await p.waitForURL(`**${next}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    server?.kill("SIGTERM");
    await pgStop?.();
  });
