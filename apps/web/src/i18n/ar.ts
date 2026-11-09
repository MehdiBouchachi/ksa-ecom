import type { OrderStatus, PaymentStatus, ShipmentStatus } from "@saudi-ecom/contracts";

/** Arabic is the default locale. Strings are centralized here so an English dictionary (en.ts) can mirror it. */
export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "بانتظار الدفع",
  CONFIRMED: "مؤكد",
  PROCESSING: "قيد التجهيز",
  READY_FOR_SHIPPING: "جاهز للشحن",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التسليم",
  CANCELLED: "ملغي",
  RETURNED: "مرتجع",
  REQUIRES_RECONCILIATION: "يتطلب مراجعة",
};
export const paymentStatusLabel: Record<PaymentStatus, string> = { PENDING: "معلق", PAID: "مدفوع", FAILED: "فشل", REFUNDED: "مسترد" };
export const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  NOT_CREATED: "لم تُنشأ بعد",
  CREATED: "تم إنشاء الشحنة",
  PICKED_UP: "استلمها الناقل",
  IN_TRANSIT: "في الطريق",
  OUT_FOR_DELIVERY: "خرجت للتوصيل",
  DELIVERED: "تم التسليم",
  FAILED: "تعذر التوصيل",
  RETURNED: "مرتجعة",
};
export const sortLabel = {
  recommended: "المقترح",
  newest: "الأحدث",
  price_asc: "السعر: من الأقل",
  price_desc: "السعر: من الأعلى",
  bestselling: "الأكثر مبيعًا",
} as const;
export const modeLabel = { RETAIL: "تجزئة", BULK: "جملة" } as const;

export const t = {
  nav: { home: "الرئيسية", products: "المنتجات", about: "من نحن", faq: "الأسئلة الشائعة", contact: "تواصل معنا", cart: "السلة", wishlist: "المفضلة", account: "حسابي", login: "تسجيل الدخول", logout: "تسجيل الخروج", admin: "لوحة التحكم" },
  common: { sar: "ر.س", addToCart: "أضف إلى السلة", buyNow: "اشترِ الآن", outOfStock: "نفدت الكمية", inStock: "متوفر", lowStock: "كمية محدودة", save: "حفظ", cancel: "إلغاء", search: "بحث", apply: "تطبيق", reset: "إعادة تعيين", next: "التالي", prev: "السابق" },
};
