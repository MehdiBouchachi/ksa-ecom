import { ContentPage, contentMetadata } from "@/components/store/content-page";

export const generateMetadata = () => contentMetadata("about", "/about");
export default function Page() {
  return <ContentPage slug="about" href="/about" />;
}
