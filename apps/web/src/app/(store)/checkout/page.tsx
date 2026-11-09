import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { getCurrentUser } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";

export const metadata: Metadata = { title: "إتمام الطلب", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  const user = await getCurrentUser();
  // Guest checkout is disabled until the merchant approves it.
  if (!user) redirect("/auth/login?next=/checkout");
  const commerce = await getSetting("commerce");
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">إتمام الطلب</h1>
      <CheckoutForm defaults={{ name: user.fullName, email: user.email, phone: user.phone ? user.phone.replace(/^\+966/, "0") : "" }} termsVersion={commerce.termsVersion} />
    </>
  );
}
