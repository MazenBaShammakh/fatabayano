import type { Metadata, Viewport } from "next";
import { Amiri_Quran, Readex_Pro } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SiteHeader, SiteFooter } from "@/components/Layout";
import { OfflineBanner } from "@/components/SystemMessage";
import "./globals.css";

const readexPro = Readex_Pro({
  variable: "--font-readex-pro",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
});

const amiriQuran = Amiri_Quran({
  variable: "--font-amiri-quran",
  subsets: ["arabic"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "فتبيّنوا",
  description: "تحقق من الرسائل المتداولة مقابل المصادر العلمية المنشورة.",
  openGraph: {
    title: "فتبيّنوا",
    description: "تحقق من الرسائل المتداولة مقابل المصادر العلمية المنشورة.",
    type: "website",
    siteName: "فتبيّنوا",
    locale: "ar_AR",
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: "#F5F4EF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${readexPro.variable} ${amiriQuran.variable}`}>
      <body>
        <div className="flex min-h-dvh flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-ink focus:px-4 focus:text-sm focus:text-white"
          >
            انتقل إلى المحتوى
          </a>
          <OfflineBanner />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[720px] flex-1 px-4 py-6">
            {children}
            <Toaster position="top-center" />
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
