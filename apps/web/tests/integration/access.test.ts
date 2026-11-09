import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Session resolution is mocked; role/status are still re-checked in PostgreSQL by the guards.
const session = vi.hoisted(() => ({ current: null as { id: string; sv: number } | null }));
vi.mock("@/server/auth/session", () => ({ getSessionIdentity: async () => session.current }));

import { sql } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db";
import { listCustomers, listTeam, updateTeamMember } from "@/server/admin/people";
import { prepareCheckout } from "@/server/orders/checkout";
import { getOrderForUser } from "@/server/orders/queries";
import { getTrackingForUser } from "@/server/shipping/service";
import { addToWishlist, listWishlist, removeFromWishlist } from "@/server/wishlist";
import { GET as customersGET } from "@/app/api/v1/admin/customers/route";
import { GET as customerGET } from "@/app/api/v1/admin/customers/[id]/route";
import { GET as teamGET, POST as teamPOST } from "@/app/api/v1/admin/team/route";
import { GET as dashboardGET } from "@/app/api/v1/admin/dashboard/route";
import { GET as adminOrderGET } from "@/app/api/v1/admin/orders/[id]/route";
import { GET as accountOrderGET } from "@/app/api/v1/account/orders/[id]/route";
import { GET as trackingGET } from "@/app/api/v1/account/orders/[id]/tracking/route";
import { POST as prepareRoute } from "@/app/api/v1/checkout/prepare/route";
import { POST as reconcileRoute } from "@/app/api/v1/cron/reconcile/route";
import { signPayload } from "@/server/lib/hmac";
import { checkoutInput, createUser, key, resetDb, seedCatalog } from "../helpers/fixtures";

afterAll(() => closeDb());
beforeEach(async () => {
  await resetDb();
  session.current = null;
});

const as = (u: { id: string } | null) => (session.current = u ? { id: u.id, sv: 1 } : null);
const req = (path: string, init?: RequestInit) => new Request(`http://localhost:3000${path}`, { ...init, headers: { origin: "http://localhost:3000", ...(init?.headers ?? {}) } });
const ctx = <P extends Record<string, string>>(p: P) => ({ params: Promise.resolve(p) });

describe("ACC-10 customers are isolated", () => {
  it("cannot read another customer's order, tracking or wishlist entries", async () => {
    const { variants } = await seedCatalog();
    const [alice, bob] = await Promise.all([createUser(), createUser()]);
    const { result } = await prepareCheckout(alice, checkoutInput([{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" }]), key());

    expect(await getOrderForUser(alice.id, result.orderId)).not.toBeNull();
    expect(await getOrderForUser(bob.id, result.orderId)).toBeNull();
    expect(await getTrackingForUser(bob.id, result.orderId)).toBeNull();

    as(bob);
    expect((await accountOrderGET(req(`/api/v1/account/orders/${result.orderId}`), ctx({ id: result.orderId }))).status).toBe(404);
    expect((await trackingGET(req(`/api/v1/account/orders/${result.orderId}/tracking`), ctx({ id: result.orderId }))).status).toBe(404);
    as(alice);
    expect((await accountOrderGET(req(`/api/v1/account/orders/${result.orderId}`), ctx({ id: result.orderId }))).status).toBe(200);

    const w = await addToWishlist(alice.id, variants[0]!.id);
    await expect(removeFromWishlist(bob.id, w.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await listWishlist(bob.id)).toHaveLength(0);
    expect(await listWishlist(alice.id)).toHaveLength(1);
  });

  it("unauthenticated and disabled accounts are rejected; stale sessions after password change are invalid", async () => {
    const u = await createUser();
    as(null);
    expect((await accountOrderGET(req("/x"), ctx({ id: "00000000-0000-0000-0000-000000000000" }))).status).toBe(401);
    await getDb().execute(sql`update users set status = 'DISABLED' where id = ${u.id}`);
    as(u);
    expect((await accountOrderGET(req("/x"), ctx({ id: "00000000-0000-0000-0000-000000000000" }))).status).toBe(401);
    await getDb().execute(sql`update users set status = 'ACTIVE', session_version = 2 where id = ${u.id}`);
    expect((await accountOrderGET(req("/x"), ctx({ id: "00000000-0000-0000-0000-000000000000" }))).status).toBe(401);
  });
});

describe("ACC-11 Manager vs Admin separation", () => {
  it("Manager gets 403 on customer directory and team endpoints, even with a guessed URL", async () => {
    const [manager, customer] = await Promise.all([createUser("MANAGER"), createUser()]);
    as(manager);
    expect((await customersGET(req("/api/v1/admin/customers"), ctx({}))).status).toBe(403);
    expect((await customerGET(req(`/api/v1/admin/customers/${customer.id}`), ctx({ id: customer.id }))).status).toBe(403);
    expect((await teamGET(req("/api/v1/admin/team"), ctx({}))).status).toBe(403);
    const create = await teamPOST(req("/api/v1/admin/team", { method: "POST", body: JSON.stringify({ name: "Evil Admin", email: "evil@x.co", role: "ADMIN", password: "0123456789ab" }), headers: { "content-type": "application/json" } }), ctx({}));
    expect(create.status).toBe(403);
    expect(await getDb().execute(sql`select 1 from users where email = 'evil@x.co'`).then((r) => r.rows.length)).toBe(0);
    // Services re-assert the role too (defense in depth).
    await expect(listCustomers(manager)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listTeam(manager)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("Manager can run operations and sees delivery details embedded in the order only", async () => {
    const { variants } = await seedCatalog();
    const [manager, buyer] = await Promise.all([createUser("MANAGER"), createUser()]);
    const { result } = await prepareCheckout(buyer, checkoutInput([{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" }]), key());
    as(manager);
    expect((await dashboardGET(req("/api/v1/admin/dashboard"), ctx({}))).status).toBe(200);
    const r = await adminOrderGET(req(`/api/v1/admin/orders/${result.orderId}`), ctx({ id: result.orderId }));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.data.order.customerSnapshot.name).toBe("عميل اختبار");
    expect(body.data.order).not.toHaveProperty("userId");
  });

  it("customers cannot reach staff endpoints; Admin can; Role changes take effect immediately (DB re-check)", async () => {
    const [cust, admin, manager] = await Promise.all([createUser(), createUser("ADMIN"), createUser("MANAGER")]);
    as(cust);
    expect((await dashboardGET(req("/api/v1/admin/dashboard"), ctx({}))).status).toBe(403);
    as(admin);
    expect((await customersGET(req("/api/v1/admin/customers"), ctx({}))).status).toBe(200);
    expect((await teamGET(req("/api/v1/admin/team"), ctx({}))).status).toBe(200);
    await updateTeamMember(admin, manager.id, { status: "DISABLED" });
    as(manager);
    expect((await dashboardGET(req("/api/v1/admin/dashboard"), ctx({}))).status).toBe(401);
  });

  it("the last active Admin cannot be demoted or disabled", async () => {
    const [a1, a2] = await Promise.all([createUser("ADMIN"), createUser("ADMIN")]);
    await updateTeamMember(a1, a2.id, { role: "MANAGER" });
    await expect(updateTeamMember(a1, a1.id, { status: "DISABLED" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("HTTP contract + CSRF + cron signature", () => {
  it("checkout prepare: 401 anonymous, 403 cross-origin, 422 without Idempotency-Key, 409 STOCK_UNAVAILABLE shape", async () => {
    const { variants } = await seedCatalog({ stock: [0, 1, 1] });
    const u = await createUser();
    const body = JSON.stringify(checkoutInput([{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" }]));
    const h = { "content-type": "application/json", "idempotency-key": key() };
    as(null);
    expect((await prepareRoute(req("/api/v1/checkout/prepare", { method: "POST", body, headers: h }), ctx({}))).status).toBe(401);
    as(u);
    expect((await prepareRoute(req("/api/v1/checkout/prepare", { method: "POST", body, headers: { ...h, origin: "https://evil.example" } }), ctx({}))).status).toBe(403);
    expect((await prepareRoute(req("/api/v1/checkout/prepare", { method: "POST", body, headers: { "content-type": "application/json" } }), ctx({}))).status).toBe(422);
    const r = await prepareRoute(req("/api/v1/checkout/prepare", { method: "POST", body, headers: h }), ctx({}));
    expect(r.status).toBe(409);
    const j = await r.json();
    expect(j.error).toMatchObject({ code: "STOCK_UNAVAILABLE" });
    expect(typeof j.error.requestId).toBe("string");
  });

  it("201 with canonical body; replay returns 200 with same order", async () => {
    const { variants } = await seedCatalog();
    const u = await createUser();
    as(u);
    const k = key();
    const body = JSON.stringify({ ...checkoutInput([{ variantId: variants[0]!.id, quantity: 2, purchaseMode: "RETAIL" }]), totalHalalas: 1 });
    const h = { "content-type": "application/json", "idempotency-key": k };
    const r1 = await prepareRoute(req("/api/v1/checkout/prepare", { method: "POST", body, headers: h }), ctx({}));
    expect(r1.status).toBe(201);
    const j1 = await r1.json();
    expect(Object.keys(j1.data).sort()).toEqual(["currency", "items", "orderId", "orderReference", "paymentStatus", "reservationExpiresAt", "shippingHalalas", "subtotalHalalas", "taxHalalas", "totalHalalas"].sort());
    expect(j1.data.totalHalalas).toBe(22500);
    const r2 = await prepareRoute(req("/api/v1/checkout/prepare", { method: "POST", body, headers: h }), ctx({}));
    expect(r2.status).toBe(200);
    expect((await r2.json()).data.orderId).toBe(j1.data.orderId);
  });

  it("cron endpoints require a valid, fresh HMAC signature", async () => {
    const path = "/api/v1/cron/reconcile";
    expect((await reconcileRoute(new Request(`http://localhost:3000${path}`, { method: "POST" }), ctx({}))).status).toBe(403);
    const stale = signPayload(process.env.CRON_SECRET!, path, Date.now() - 3600_000);
    expect((await reconcileRoute(new Request(`http://localhost:3000${path}`, { method: "POST", headers: { "x-cron-signature": stale } }), ctx({}))).status).toBe(403);
    const good = signPayload(process.env.CRON_SECRET!, path);
    const ok = await reconcileRoute(new Request(`http://localhost:3000${path}`, { method: "POST", headers: { "x-cron-signature": good } }), ctx({}));
    expect(ok.status).toBe(200);
    expect((await ok.json()).data.report).toMatchObject({ scanned: 0 });
  });
});
