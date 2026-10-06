import type { Metadata } from "next";
import { ProseList, ProsePage, ProseSection } from "@/components/Prose";
import { privacy } from "@/content/privacy";

export const metadata: Metadata = {
  title: "الخصوصية — فتبيّنوا",
  description: "ما نحفظه وما لا نحفظه، وكيف نعالج رسالتك.",
  openGraph: {
    title: "الخصوصية — فتبيّنوا",
    description: "ما نحفظه وما لا نحفظه، وكيف نعالج رسالتك.",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <ProsePage title={privacy.title} intro={privacy.intro}>
      {privacy.sections.map((s) => (
        <ProseSection key={s.heading} heading={s.heading}>
          <ProseList items={s.items} />
        </ProseSection>
      ))}
    </ProsePage>
  );
}
