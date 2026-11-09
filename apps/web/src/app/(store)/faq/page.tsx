import { ContentPage, contentMetadata } from "@/components/store/content-page";

export const generateMetadata = () => contentMetadata("faq", "/faq");
export default function Page() {
  return <ContentPage slug="faq" href="/faq" />;
}
