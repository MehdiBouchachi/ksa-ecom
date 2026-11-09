import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { CheckoutPrepareInput } from "@saudi-ecom/contracts";
import { getDb } from "@/server/db";
import { colors, inventory, priceTiers, productVariants, products, sizes, storeSettings, users } from "@/server/db/schema";

export async function resetDb() {
  const res = await getDb().execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = res.rows.map((r) => `"${r.tablename}"`).join(", ");
  if (names) await getDb().execute(sql.raw(`truncate ${names} restart identity cascade`));
}

export async function createUser(role: "CUSTOMER" | "MANAGER" | "ADMIN" = "CUSTOMER", email = `${role.toLowerCase()}-${randomUUID()}@test.local`) {
  const [u] = await getDb()
    .insert(users)
    .values({ email, fullName: `Test ${role}`, role, passwordHash: "$2a$04$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv" })
    .returning();
  return { id: u!.id, email: u!.email, role: u!.role, fullName: u!.fullName, phone: u!.phone };
}

/** Test catalog: values are TEST DATA only (not merchant prices). */
export async function seedCatalog(opts: { stock?: number[]; shippingFlatHalalas?: number | null; pricesIncludeVat?: boolean } = {}) {
  const db = getDb();
  await db.insert(storeSettings).values({
    key: "commerce",
    value: {
      vatRateBps: 1500,
      pricesIncludeVat: opts.pricesIncludeVat ?? true,
      reservationMinutes: 15,
      termsVersion: "t1",
      shippingFlatHalalas: opts.shippingFlatHalalas === undefined ? 2500 : opts.shippingFlatHalalas,
      freeShippingThresholdHalalas: null,
    },
  });
  const [p] = await db.insert(products).values({ slug: "test-product", name: "منتج اختبار" }).returning();
  const [black, white] = await db
    .insert(colors)
    .values([
      { slug: "black", name: "أسود", swatchHex: "#000000", sortOrder: 1 },
      { slug: "white", name: "أبيض", swatchHex: "#FFFFFF", sortOrder: 2 },
    ])
    .returning();
  const [m, l] = await db
    .insert(sizes)
    .values([
      { slug: "m", name: "M", sortOrder: 1 },
      { slug: "l", name: "L", sortOrder: 2 },
    ])
    .returning();
  const combos = [
    [black!, m!],
    [black!, l!],
    [white!, m!],
  ] as const;
  const stock = opts.stock ?? [10, 10, 10];
  const variants = [];
  for (let i = 0; i < combos.length; i++) {
    const [c, s] = combos[i]!;
    const [v] = await db
      .insert(productVariants)
      .values({ productId: p!.id, colorId: c.id, sizeId: s.id, sku: `TST-${c.slug}-${s.slug}`.toUpperCase(), retailPriceHalalas: 10000 })
      .returning();
    await db.insert(inventory).values({ variantId: v!.id, onHand: stock[i] ?? 0 });
    variants.push(v!);
  }
  return { product: p!, variants, colors: { black: black!, white: white! }, sizes: { m: m!, l: l! } };
}

export async function addBulkTiers(variantId: string) {
  await getDb().insert(priceTiers).values([
    { variantId, mode: "BULK", minQty: 10, maxQty: 49, unitPriceHalalas: 8000 },
    { variantId, mode: "BULK", minQty: 50, maxQty: 199, unitPriceHalalas: 7000 },
    { variantId, mode: "BULK", minQty: 200, maxQty: null, unitPriceHalalas: 6000 },
  ]);
}

export function checkoutInput(items: CheckoutPrepareInput["items"]): CheckoutPrepareInput {
  return {
    items,
    customer: { name: "عميل اختبار", email: "buyer@test.local", phone: "+966500000000" },
    shippingAddress: { city: "الرياض", district: "العليا", street: "شارع الاختبار", building: "12", postalCode: "12345" },
    acceptedTermsVersion: "t1",
  };
}

export async function inv(variantId: string) {
  const r = await getDb().execute<{ on_hand: number; reserved: number }>(sql`select on_hand, reserved from inventory where variant_id = ${variantId}`);
  return { onHand: r.rows[0]!.on_hand, reserved: r.rows[0]!.reserved };
}

export const key = () => `idem-${randomUUID()}`;
