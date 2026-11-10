import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";

export const dynamic = "force-dynamic";

/** Home page is full-bleed (sections own their width); every other store page uses (store)/layout. */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
