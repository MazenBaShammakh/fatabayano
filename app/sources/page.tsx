import type { Metadata } from "next";
import { ExternalSourceRow, ProsePage, ProseSection } from "@/components/Prose";
import { sources } from "@/content/sources";

export const metadata: Metadata = {
  title: "المصادر — فتبيّنوا",
  description: "المصادر العلمية المنشورة التي نبحث فيها: القرآن الكريم والحديث والفتاوى.",
  openGraph: {
    title: "المصادر — فتبيّنوا",
    description: "المصادر العلمية المنشورة التي نبحث فيها: القرآن الكريم والحديث والفتاوى.",
    type: "website",
  },
};

export default function SourcesPage() {
  return (
    <ProsePage title={sources.title} intro={sources.intro}>
      {sources.groups.map((g) => (
        <ProseSection key={g.heading} heading={g.heading}>
          <ul className="space-y-3">
            {g.items.map((s) => (
              <ExternalSourceRow key={s.url} {...s} />
            ))}
          </ul>
        </ProseSection>
      ))}
      <p className="text-slate">{sources.note}</p>
    </ProsePage>
  );
}
