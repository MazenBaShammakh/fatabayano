import type { Metadata } from "next";
import { HomePage } from "./home";

export const metadata: Metadata = {
  title: "فتبيّنوا — تحقق من الرسائل المتداولة",
  description: "تحقق من الأحاديث والآيات والأدعية في الرسائل المتداولة مقابل المصادر العلمية المنشورة.",
  openGraph: {
    title: "فتبيّنوا — تحقق من الرسائل المتداولة",
    description: "ما تقوله المصادر العلمية المنشورة عن الرسائل المتداولة.",
    type: "website",
  },
};

export default function Page() {
  return <HomePage />;
}
