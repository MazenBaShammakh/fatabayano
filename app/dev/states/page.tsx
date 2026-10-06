import type { Metadata } from "next";
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
  return <DevStates />;
}
