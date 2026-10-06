import type { Metadata } from "next";
import { SharedCard } from "./shared-card";

export const metadata: Metadata = {
  title: "نتيجة تحقق | فتبيّنوا",
  description: "نتيجة تحقق مُشارَكة: ما نشره أهل العلم عن الآيات والأحاديث والأدعية في رسالة متداولة، مع مصادرها.",
  openGraph: {
    title: "نتيجة تحقق | فتبيّنوا",
    description: "ما نشره أهل العلم عن الآيات والأحاديث والأدعية في رسالة متداولة، مع مصادرها.",
    type: "website",
    siteName: "فتبيّنوا",
  },
};

export default async function SharedCardPage({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  return <SharedCard key={id} id={id} />;
}
