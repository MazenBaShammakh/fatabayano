import Link from "next/link";
import type { ReactNode } from "react";
import { DisclosureStrip } from "./Blocks";

export function SiteHeader() {
  return (
    <header className="border-b border-line bar-glass sticky top-0 z-30">
      <div className="mx-auto flex h-16 max-w-[720px] items-center px-4">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-md text-2xl font-bold text-ink">
          فتبيّنوا
        </Link>
      </div>
    </header>
  );
}

const footerLinks = [
  { to: "/about", label: "عن الأداة" },
  { to: "/sources", label: "المصادر" },
  { to: "/privacy", label: "الخصوصية" },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[720px] space-y-3 px-4 py-6">
        <DisclosureStrip />
        <nav className="flex flex-wrap gap-x-4">
          {footerLinks.map((l) => (
            <Link key={l.to} href={l.to} className="inline-flex min-h-11 items-center text-sm text-teal underline-offset-4 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function PageShell({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {children}
    </section>
  );
}
