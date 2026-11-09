import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
