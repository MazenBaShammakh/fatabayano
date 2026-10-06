import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

export function ProsePage({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[640px] space-y-8 text-base leading-[1.8] text-ink">
      <header className="space-y-2">
        <h1 className="text-[28px] font-bold leading-tight">{title}</h1>
        {intro && <p className="text-slate">{intro}</p>}
      </header>
      {children}
    </article>
  );
}

export function ProseSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{heading}</h2>
      {children}
    </section>
  );
}

export function ProseList({ items, ordered = false }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={ordered ? "list-decimal space-y-2 ps-6" : "list-disc space-y-2 ps-6"}>
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </Tag>
  );
}

export function ExternalSourceRow({ name, description, url }: { name: string; description: string; url: string }) {
  const host = url.replace(/^https?:\/\//, "");
  return (
    <li className="space-y-1 rounded-lg border border-line bg-card shadow-card p-4">
      <p className="font-bold">{name}</p>
      <p className="text-slate">{description}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1.5 text-teal underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        <span dir="ltr">{host}</span>
        <ExternalLink className="size-4" aria-hidden />
        <span className="sr-only">(يفتح في نافذة جديدة)</span>
      </a>
    </li>
  );
}
