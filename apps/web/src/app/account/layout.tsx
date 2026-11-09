import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/auth/actions";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { getCurrentUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/account/orders");
  return (
    <>
      <Header />
      <main id="main" className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr]">
        <nav aria-label="حسابي" className="flex gap-2 overflow-x-auto md:flex-col">
          <Link href="/account/orders" className="whitespace-nowrap rounded-md px-3 py-2.5 hover:bg-muted">طلباتي</Link>
          <Link href="/wishlist" className="whitespace-nowrap rounded-md px-3 py-2.5 hover:bg-muted">المفضلة</Link>
          <Link href="/account/profile" className="whitespace-nowrap rounded-md px-3 py-2.5 hover:bg-muted">الملف الشخصي</Link>
          <form action={logoutAction}>
            <button className="w-full whitespace-nowrap rounded-md px-3 py-2.5 text-start text-destructive hover:bg-red-50">تسجيل الخروج</button>
          </form>
        </nav>
        <div className="min-w-0">{children}</div>
      </main>
      <Footer />
    </>
  );
}
