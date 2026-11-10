"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { inventoryAdjustmentSchema, orderCancelSchema, orderStatusChangeSchema, teamMemberCreateSchema, teamMemberUpdateSchema } from "@saudi-ecom/contracts";
import { addMedia, addTier, addTiersBatch, deactivateTier, deleteMedia, deleteTaxonomy, saveColor, saveContent, saveProduct, saveSize, saveTaxonomy, saveVariant, type TaxonomyTable } from "@/server/admin/catalog";
import { createTeamMember, inviteTeamMember, setCustomerStatus, updateTeamMember } from "@/server/admin/people";
import { requireAdmin, requireStaff } from "@/server/auth/guards";
import { adjustStock } from "@/server/inventory";
import { getLocale } from "@/i18n/locale";
import { isAppError } from "@/server/lib/errors";
import { putSetting } from "@/server/lib/settings";
import { cancelOrder, changeOrderStatus } from "@/server/orders/queries";
import { createShipmentForOrder, refreshShipment } from "@/server/shipping/service";
import { ZodError } from "zod";

/*
 * Every action re-authorizes on the server (never trusts hidden fields or the UI).
 * Results are reported via ?ok= / ?error= on redirect so pages work without client JS.
 */
/** English versions of the success messages (errors come from the domain layer, Arabic for now). */
const OK_EN: Record<string, string> = {
  "تم الحفظ": "Saved",
  "تم الحذف": "Deleted",
  "تم إيقاف الشريحة": "Tier deactivated",
  "تم تعديل المخزون": "Stock adjusted",
  "تم إلغاء الطلب": "Order cancelled",
  "تم إنشاء الشحنة": "Shipment created",
  "تم تحديث التتبع": "Tracking updated",
};
async function run(back: string, fn: () => Promise<unknown>, okMsg = "تم الحفظ") {
  const msg = (await getLocale()) === "en" ? (OK_EN[okMsg] ?? okMsg) : okMsg;
  let target = `${back}${back.includes("?") ? "&" : "?"}ok=${encodeURIComponent(msg)}`;
  try {
    await fn();
    revalidatePath("/admin", "layout");
  } catch (e) {
    const msg = isAppError(e) ? e.message : e instanceof ZodError ? `بيانات غير صالحة: ${e.issues.map((i) => i.path.join(".")).join("، ")}` : null;
    if (!msg) throw e;
    target = `${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(msg)}`;
  }
  redirect(target);
}

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
const int = (fd: FormData, k: string) => (str(fd, k) === "" ? null : Number(str(fd, k)));
const sarToHalalas = (fd: FormData, k: string) => (str(fd, k) === "" ? null : Math.round(Number(str(fd, k)) * 100));
const bool = (fd: FormData, k: string) => fd.get(k) === "on";
const back = (fd: FormData, fallback: string) => {
  const b = str(fd, "back");
  return b.startsWith("/admin") ? b : fallback;
};

/* Orders */
export async function orderStatusAction(fd: FormData) {
  const u = await requireStaff();
  const id = str(fd, "orderId");
  await run(`/admin/orders/${id}`, async () => {
    const b = orderStatusChangeSchema.parse({ status: str(fd, "status"), note: optStr(fd, "note") ?? undefined });
    await changeOrderStatus(id, b.status, u, b.note);
  });
}
export async function orderCancelAction(fd: FormData) {
  const u = await requireStaff();
  const id = str(fd, "orderId");
  await run(`/admin/orders/${id}`, async () => {
    const b = orderCancelSchema.parse({ reason: str(fd, "reason"), restock: bool(fd, "restock") });
    await cancelOrder(id, u, b.reason, b.restock);
  }, "تم إلغاء الطلب");
}
export async function createShipmentAction(fd: FormData) {
  const u = await requireStaff();
  const id = str(fd, "orderId");
  await run(back(fd, `/admin/orders/${id}`), () => createShipmentForOrder(id, u.id), "تم إنشاء الشحنة");
}
export async function refreshShipmentAction(fd: FormData) {
  await requireStaff();
  await run(back(fd, "/admin/shipping"), () => refreshShipment(str(fd, "shipmentId")), "تم تحديث التتبع");
}

/* Catalog */
export async function saveProductAction(fd: FormData) {
  const u = await requireStaff();
  const specs = str(fd, "specs")
    .split("\n")
    .map((l) => l.split(":"))
    .filter((p) => p.length >= 2 && p[0]!.trim())
    .map(([label, ...v]) => ({ label: label!.trim(), value: v.join(":").trim() }));
  await run("/admin/products", () =>
    saveProduct(u.id, {
      id: optStr(fd, "id") ?? undefined,
      slug: str(fd, "slug"),
      name: str(fd, "name"),
      nameEn: optStr(fd, "nameEn"),
      description: str(fd, "description"),
      specs,
      seoTitle: optStr(fd, "seoTitle"),
      seoDescription: optStr(fd, "seoDescription"),
      featured: bool(fd, "featured"),
      active: bool(fd, "active"),
      sortOrder: int(fd, "sortOrder") ?? 0,
      categoryIds: fd.getAll("categoryIds").map(String),
      brandIds: fd.getAll("brandIds").map(String),
      collectionIds: fd.getAll("collectionIds").map(String),
    }),
  );
}
export async function addMediaAction(fd: FormData) {
  const u = await requireStaff();
  await run(`/admin/products?edit=${str(fd, "productId")}`, () =>
    addMedia(u.id, { productId: str(fd, "productId"), colorId: optStr(fd, "colorId"), kind: str(fd, "kind") || "IMAGE", url: str(fd, "url"), alt: str(fd, "alt"), width: int(fd, "width"), height: int(fd, "height"), sortOrder: int(fd, "sortOrder") ?? 0 }),
  );
}
export async function deleteMediaAction(fd: FormData) {
  const u = await requireStaff();
  await run(`/admin/products?edit=${str(fd, "productId")}`, () => deleteMedia(u.id, str(fd, "mediaId")), "تم الحذف");
}
export async function saveColorAction(fd: FormData) {
  const u = await requireStaff();
  await run("/admin/variants", () => saveColor(u.id, { id: optStr(fd, "id") ?? undefined, slug: str(fd, "slug"), name: str(fd, "name"), nameEn: optStr(fd, "nameEn"), swatchHex: str(fd, "swatchHex"), sortOrder: int(fd, "sortOrder") ?? 0, active: bool(fd, "active") }));
}
export async function saveSizeAction(fd: FormData) {
  const u = await requireStaff();
  await run("/admin/variants", () => saveSize(u.id, { id: optStr(fd, "id") ?? undefined, slug: str(fd, "slug"), name: str(fd, "name"), sortOrder: int(fd, "sortOrder") ?? 0, active: bool(fd, "active") }));
}
export async function saveVariantAction(fd: FormData) {
  const u = await requireStaff();
  await run(back(fd, "/admin/variants"), () =>
    saveVariant(u.id, {
      id: optStr(fd, "id") ?? undefined,
      productId: str(fd, "productId"),
      colorId: str(fd, "colorId"),
      sizeId: str(fd, "sizeId"),
      sku: str(fd, "sku"),
      retailPriceHalalas: sarToHalalas(fd, "retailPrice"),
      compareAtPriceHalalas: sarToHalalas(fd, "compareAtPrice"),
      active: bool(fd, "active"),
    }),
  );
}
export async function addTierAction(fd: FormData) {
  const u = await requireStaff();
  await run(back(fd, `/admin/pricing?variantId=${str(fd, "variantId")}`), () =>
    addTier(u.id, { variantId: str(fd, "variantId"), mode: str(fd, "mode"), minQty: int(fd, "minQty"), maxQty: int(fd, "maxQty"), unitPriceHalalas: sarToHalalas(fd, "unitPrice") }),
  );
}
export async function addTiersBatchAction(fd: FormData) {
  const u = await requireStaff();
  await run(back(fd, "/admin/pricing"), () =>
    addTiersBatch(u.id, { variantIds: fd.getAll("variantIds").map(String), mode: str(fd, "mode"), minQty: int(fd, "minQty"), maxQty: int(fd, "maxQty"), unitPriceHalalas: sarToHalalas(fd, "unitPrice") }),
  );
}
export async function deactivateTierAction(fd: FormData) {
  const u = await requireStaff();
  await run(back(fd, `/admin/pricing?variantId=${str(fd, "variantId")}`), () => deactivateTier(u.id, str(fd, "tierId")), "تم إيقاف الشريحة");
}
export async function saveTaxonomyAction(fd: FormData) {
  const u = await requireStaff();
  const kind = str(fd, "kind") as TaxonomyTable;
  if (!["categories", "brands", "collections"].includes(kind)) throw new Error("bad kind");
  await run(`/admin/${kind}`, () =>
    saveTaxonomy(u.id, kind, { id: optStr(fd, "id") ?? undefined, slug: str(fd, "slug"), name: str(fd, "name"), nameEn: optStr(fd, "nameEn"), description: str(fd, "description"), seoTitle: optStr(fd, "seoTitle"), seoDescription: optStr(fd, "seoDescription"), sortOrder: int(fd, "sortOrder") ?? 0, active: bool(fd, "active") }),
  );
}
export async function deleteTaxonomyAction(fd: FormData) {
  const u = await requireStaff();
  const kind = str(fd, "kind") as TaxonomyTable;
  if (!["categories", "brands", "collections"].includes(kind)) throw new Error("bad kind");
  await run(`/admin/${kind}`, () => deleteTaxonomy(u.id, kind, str(fd, "id")), "تم الحذف");
}

/* Inventory */
export async function adjustStockAction(fd: FormData) {
  const u = await requireStaff();
  await run(back(fd, "/admin/inventory"), async () => {
    const b = inventoryAdjustmentSchema.parse({ variantId: str(fd, "variantId"), delta: int(fd, "delta"), reason: str(fd, "reason") });
    await adjustStock({ ...b, actorId: u.id });
  }, "تم تعديل المخزون");
}

/* Settings & content */
export async function saveOperationalSettingsAction(fd: FormData) {
  const u = await requireStaff(); // Managers allowed: shipping table + low-stock threshold only
  await run(back(fd, "/admin/shipping"), () =>
    putSetting("commerce", { shippingFlatHalalas: sarToHalalas(fd, "shippingFlat"), freeShippingThresholdHalalas: sarToHalalas(fd, "freeThreshold"), lowStockThreshold: int(fd, "lowStockThreshold") ?? 5 }, u.id),
  );
}
export async function saveCommerceSettingsAction(fd: FormData) {
  const u = await requireAdmin(); // privileged: tax, holds, terms version
  await run(back(fd, "/admin/settings"), () =>
    putSetting("commerce", { vatRateBps: int(fd, "vatRateBps") ?? 1500, pricesIncludeVat: bool(fd, "pricesIncludeVat"), reservationMinutes: int(fd, "reservationMinutes") ?? 15, termsVersion: str(fd, "termsVersion") }, u.id),
  );
}
/**
 * Settings are split across tabs, so only the fields present in the submitted form are written
 * (putSetting merges); a tab never blanks fields that belong to another tab.
 */
export async function saveStoreProfileAction(fd: FormData) {
  const u = await requireAdmin();
  const v: Record<string, unknown> = {};
  for (const k of ["name", "nameEn"] as const) if (fd.has(k)) v[k] = str(fd, k);
  for (const k of ["legalName", "commercialRegistration", "vatNumber", "email", "phone", "whatsapp", "address"] as const) if (fd.has(k)) v[k] = optStr(fd, k);
  if (fd.has("_paymentMethods")) v.enabledPaymentMethods = fd.getAll("enabledPaymentMethods").map(String);
  if (fd.has("_legal")) v.legalApproved = bool(fd, "legalApproved");
  await run(back(fd, "/admin/settings"), () => putSetting("store", v as never, u.id));
}
export async function saveContentAction(fd: FormData) {
  const u = await requireStaff();
  await run(`/admin/settings?tab=content&content=${str(fd, "slug")}`, () => saveContent(u, { slug: str(fd, "slug"), title: str(fd, "title"), body: str(fd, "body"), approved: bool(fd, "approved") }));
}

/* ADMIN ONLY: people */
export async function createTeamAction(fd: FormData) {
  const u = await requireAdmin();
  await run("/admin/team", async () => {
    if (str(fd, "password")) await createTeamMember(u, teamMemberCreateSchema.parse({ name: str(fd, "name"), email: str(fd, "email"), role: str(fd, "role"), password: str(fd, "password") }));
    else await inviteTeamMember(u, teamMemberCreateSchema.omit({ password: true }).parse({ name: str(fd, "name"), email: str(fd, "email"), role: str(fd, "role") }));
  });
}
export async function updateTeamAction(fd: FormData) {
  const u = await requireAdmin();
  await run("/admin/team", () => updateTeamMember(u, str(fd, "id"), teamMemberUpdateSchema.parse({ role: optStr(fd, "role") ?? undefined, status: optStr(fd, "status") ?? undefined })));
}
export async function customerStatusAction(fd: FormData) {
  const u = await requireAdmin();
  await run(`/admin/customers/${str(fd, "id")}`, () => setCustomerStatus(u, str(fd, "id"), str(fd, "status") === "DISABLED" ? "DISABLED" : "ACTIVE"));
}
