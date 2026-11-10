import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";

export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="container-store min-h-[60vh] py-6 md:py-10">
        {children}
      </main>
      <Footer />
    </>
  );
}
