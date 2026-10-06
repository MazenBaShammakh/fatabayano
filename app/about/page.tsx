import type { Metadata } from "next";
import { ProseList, ProsePage, ProseSection } from "@/components/Prose";
import { VerdictChip } from "@/components/VerdictChip";
import { about } from "@/content/about";

export const metadata: Metadata = {
  title: "عن الأداة — فتبيّنوا",
  description: "كيف تعمل فتبيّنوا، وما يعنيه كل حكم، وما لا نفعله.",
  openGraph: {
    title: "عن الأداة — فتبيّنوا",
    description: "كيف تعمل فتبيّنوا، وما يعنيه كل حكم، وما لا نفعله.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <ProsePage title={about.title} intro={about.intro}>
      <ProseSection heading={about.steps.heading}>
        <ProseList items={about.steps.items} ordered />
      </ProseSection>
      <ProseSection heading={about.verdicts.heading}>
        <ul className="space-y-4">
          {about.verdicts.items.map((v) => (
            <li key={v.verdict} className="space-y-1">
              <VerdictChip verdict={v.verdict} />
              <p>{v.meaning}</p>
            </li>
          ))}
        </ul>
      </ProseSection>
      <ProseSection heading={about.notDo.heading}>
        <ProseList items={about.notDo.items} />
      </ProseSection>
      <ProseSection heading={about.ai.heading}>
        {about.ai.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </ProseSection>
    </ProsePage>
  );
}
