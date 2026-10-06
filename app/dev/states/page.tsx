import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DevStates } from "./states";

export const metadata: Metadata = {
  title: "حالات المكونات — فتبيّنوا",
  description: "معاينة جميع مكونات الواجهة.",
  openGraph: {
    title: "حالات المكونات — فتبيّنوا",
    description: "معاينة جميع مكونات الواجهة.",
  },
  robots: { index: false },
};

export default function Page() {
  // Component preview with DEMO DATA, not real rulings: development only.
  if (process.env.NODE_ENV === "production") notFound();
  return <DevStates />;
}
