/**
 * DEMO DATA for local development and staging walkthroughs ONLY.
 * Prices, stock, colours, sizes and policy texts below are PLACEHOLDERS — not merchant data.
 * Refuses to run when NODE_ENV=production unless --force-staging is passed.
 */
import { closeDb, getDb, withTx } from "../src/server/db";
import { brands, categories, collections, colors, contentPages, inventory, priceTiers, productBrands, productCategories, productCollections, productVariants, products, sizes } from "../src/server/db/schema";
import { putSetting } from "../src/server/lib/settings";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--force-staging")) {
  console.error("Refusing to seed demo data in production.");
  process.exit(1);
}

const existing = await getDb().select({ id: products.id }).from(products).limit(1);
if (existing.length) {
  console.log("[seed] catalog already has products; skipping.");
  await closeDb();
  process.exit(0);
}

await withTx(async (tx) => {
  await putSetting("commerce", { vatRateBps: 1500, pricesIncludeVat: true, reservationMinutes: 15, termsVersion: "draft-1", shippingFlatHalalas: 2500, freeShippingThresholdHalalas: 50000, lowStockThreshold: 5 }, null, tx);
  await putSetting("store", { name: "متجر تجريبي", nameEn: "Demo Store", enabledPaymentMethods: [], legalApproved: false }, null, tx);

  const [p] = await tx
    .insert(products)
    .values({
      slug: "demo-tshirt",
      name: "تيشيرت قطني (منتج تجريبي)",
      nameEn: "Cotton T-shirt (demo)",
      description: "وصف تجريبي. استبدله بوصف المنتج الحقيقي من التاجر.",
      specs: [
        { label: "الخامة", value: "بيانات تجريبية" },
        { label: "العناية", value: "بيانات تجريبية" },
      ],
      featured: true,
    })
    .returning();
  const cs = await tx
    .insert(colors)
    .values([
      { slug: "black", name: "أسود", nameEn: "Black", swatchHex: "#1C1917", sortOrder: 1 },
      { slug: "white", name: "أبيض", nameEn: "White", swatchHex: "#FAFAF9", sortOrder: 2 },
      { slug: "navy", name: "كحلي", nameEn: "Navy", swatchHex: "#1E3A8A", sortOrder: 3 },
    ])
    .returning();
  const ss = await tx
    .insert(sizes)
    .values(["S", "M", "L", "XL"].map((n, i) => ({ slug: n.toLowerCase(), name: n, sortOrder: i })))
    .returning();
  const [cat] = await tx.insert(categories).values({ slug: "tshirts", name: "تيشيرتات", description: "تصنيف تجريبي." }).returning();
  const [br] = await tx.insert(brands).values({ slug: "demo-brand", name: "علامة تجريبية", description: "علامة تجريبية." }).returning();
  const [col] = await tx.insert(collections).values({ slug: "basics", name: "الأساسيات", description: "مجموعة تجريبية." }).returning();
  await tx.insert(productCategories).values({ productId: p!.id, categoryId: cat!.id });
  await tx.insert(productBrands).values({ productId: p!.id, brandId: br!.id });
  await tx.insert(productCollections).values({ productId: p!.id, collectionId: col!.id });

  let n = 0;
  for (const c of cs) {
    for (const s of ss) {
      const [v] = await tx
        .insert(productVariants)
        .values({ productId: p!.id, colorId: c.id, sizeId: s.id, sku: `DEMO-${c.slug}-${s.slug}`.toUpperCase(), retailPriceHalalas: 7900 })
        .returning();
      await tx.insert(inventory).values({ variantId: v!.id, onHand: n++ % 5 === 0 ? 2 : 40 });
      await tx.insert(priceTiers).values([
        { variantId: v!.id, mode: "BULK", minQty: 12, maxQty: 47, unitPriceHalalas: 6500 },
        { variantId: v!.id, mode: "BULK", minQty: 48, maxQty: null, unitPriceHalalas: 5900 },
      ]);
    }
  }

  const draft = (title: string, body: string) => ({ title, body, approved: false });
  await tx.insert(contentPages).values([
    { slug: "about", ...draft("من نحن", "نص تجريبي عن المتجر. يجب استبداله بمعلومات التاجر الحقيقية.") },
    { slug: "faq", ...draft("الأسئلة الشائعة", "## كم مدة التوصيل؟\nإجابة تجريبية — يحددها التاجر.\n\n## هل يمكن الشراء بالجملة؟\nنعم، اختر \"جملة\" في صفحة المنتج لعرض الشرائح والحد الأدنى.\n\n## كيف أتتبع طلبي؟\nمن صفحة طلباتي بعد إنشاء بوليصة الشحن.") },
    { slug: "shipping", ...draft("سياسة الشحن", "## نطاق الشحن\nداخل المملكة العربية السعودية عبر أرامكس.\n\n## المدة والتكلفة\nيحددها التاجر — مسودة.") },
    { slug: "returns", ...draft("الاسترجاع والاستبدال", "مسودة سياسة استرجاع. يجب أن تتوافق مع نظام التجارة الإلكترونية وحماية المستهلك ويعتمدها التاجر.") },
    { slug: "privacy", ...draft("سياسة الخصوصية", "## البيانات التي نجمعها\nالاسم، البريد، الجوال، عنوان الشحن لغرض تنفيذ الطلبات.\n\n## حقوقك\nيمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها عبر صفحة تواصل معنا.\n\n## الجهات المعالجة\nمزود الدفع، أرامكس، مزود البريد، مزود قاعدة البيانات — يحددها التاجر.\n\nمسودة: تتطلب مراجعة قانونية وفق نظام حماية البيانات الشخصية (PDPL).") },
    { slug: "terms", ...draft("الشروط والأحكام", "مسودة شروط وأحكام (draft-1). يجب أن يعتمدها التاجر/المستشار القانوني قبل الإطلاق.") },
  ]);
});
console.log("[seed] demo catalog created (placeholder data — replace before launch)");
await closeDb();
