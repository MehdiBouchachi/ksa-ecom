import { formatSAR } from "@saudi-ecom/contracts";

/** Arabic transactional email templates (RTL). Plain, accessible HTML with text fallback. */
export type Rendered = { subject: string; text: string; html: string };

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function wrap(title: string, bodyHtml: string, storeName: string) {
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#f6f5f2;margin:0;padding:24px;color:#1c1917">
<div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${bodyHtml}
<p style="margin-top:24px;font-size:12px;color:#78716c">${esc(storeName)}</p></div></body></html>`;
}

export function render(kind: string, p: Record<string, unknown>, ctx: { appUrl: string; storeName: string }): Rendered {
  const orderUrl = `${ctx.appUrl}/account/orders`;
  switch (kind) {
    case "ORDER_RECEIVED": {
      const subject = `تم استلام طلبك ${p.orderReference}`;
      const text = `مرحبًا ${p.name ?? ""}، استلمنا طلبك رقم ${p.orderReference} بإجمالي ${formatSAR(Number(p.totalHalalas))}. سيتم تأكيده بعد إتمام الدفع.`;
      return { subject, text, html: wrap(subject, `<p>${esc(text)}</p><p><a href="${orderUrl}">عرض طلباتي</a></p>`, ctx.storeName) };
    }
    case "PAYMENT_CONFIRMED": {
      const subject = `تم تأكيد الدفع للطلب ${p.orderReference}`;
      const text = `شكرًا لك ${p.name ?? ""}! تم تأكيد دفع طلبك رقم ${p.orderReference} بإجمالي ${formatSAR(Number(p.totalHalalas))}. سنبلغك عند الشحن. ملاحظة: هذه الرسالة ليست فاتورة ضريبية.`;
      return { subject, text, html: wrap(subject, `<p>${esc(text)}</p><p><a href="${orderUrl}">تفاصيل الطلب</a></p>`, ctx.storeName) };
    }
    case "ORDER_SHIPPED": {
      const subject = `تم شحن طلبك ${p.orderReference}`;
      const text = `تم شحن طلبك رقم ${p.orderReference} عبر أرامكس. رقم بوليصة الشحن: ${p.awb}.`;
      return { subject, text, html: wrap(subject, `<p>${esc(text)}</p><p><a href="${orderUrl}">تتبع الشحنة</a></p>`, ctx.storeName) };
    }
    case "ORDER_CANCELLED": {
      const subject = `تم إلغاء الطلب ${p.orderReference}`;
      const reason = p.reason === "expired" ? "انتهت مهلة الدفع وتم تحرير المنتجات المحجوزة." : esc(p.reason ?? "");
      const text = `تم إلغاء طلبك رقم ${p.orderReference}. ${reason}`;
      return { subject, text, html: wrap(subject, `<p>${esc(text)}</p>`, ctx.storeName) };
    }
    case "PASSWORD_RESET": {
      const subject = "إعادة تعيين كلمة المرور";
      const link = `${ctx.appUrl}/auth/reset-password?token=${encodeURIComponent(String(p.token))}`;
      const text = `طلبت إعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة: ${link} — إذا لم تطلب ذلك فتجاهل هذه الرسالة.`;
      return { subject, text, html: wrap(subject, `<p>طلبت إعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة.</p><p><a href="${esc(link)}">إعادة تعيين كلمة المرور</a></p><p>إذا لم تطلب ذلك فتجاهل هذه الرسالة.</p>`, ctx.storeName) };
    }
    case "SUPPORT_REQUEST": {
      const subject = `رسالة تواصل جديدة: ${p.subject}`;
      const text = `من: ${p.name} <${p.email}>\n${p.message}`;
      return { subject, text, html: wrap(subject, `<p>من: ${esc(p.name)} &lt;${esc(p.email)}&gt;</p><p style="white-space:pre-wrap">${esc(p.message)}</p>`, ctx.storeName) };
    }
    case "STAFF_ALERT": {
      const subject = `تنبيه تشغيلي: ${p.orderReference ?? ""}`;
      const text = String(p.reason ?? "");
      return { subject, text, html: wrap(subject, `<p>${esc(text)}</p>`, ctx.storeName) };
    }
    default:
      throw new Error(`unknown notification kind ${kind}`);
  }
}
