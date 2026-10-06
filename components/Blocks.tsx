import { ExternalLink } from "lucide-react";

export function ScriptureBlock({ label, text, reference }: { label: string; text: string; reference?: string }) {
  return (
    <figure dir="rtl" className="rounded-md border border-scripture-line bg-scripture p-3">
      <figcaption className="text-xs font-medium text-teal-deep">{label}</figcaption>
      <blockquote className="scripture-text mt-1 text-ink">{text}</blockquote>
      {reference && <p className="mt-1 text-xs text-teal-deep">{reference}</p>}
    </figure>
  );
}

export function QuotedClaim({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-line bg-card p-3">
      <p className="text-xs text-slate">{label}</p>
      <p className="mt-1 text-[15px] leading-7 text-ink">{text}</p>
    </div>
  );
}

export function GeneratedBlock({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-line bg-card p-3">
      <p className="text-xs text-slate">شرح مُولَّد بالذكاء الاصطناعي</p>
      <p className="mt-1 text-sm leading-7 text-ink">{text}</p>
    </div>
  );
}

export function SourceRow({ name, scholar, ruling, url }: { name: string; scholar?: string; ruling?: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center gap-3 rounded-md border border-line bg-card px-3 py-2 hover:border-teal"
    >
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{name}</p>
        {(scholar || ruling) && (
          <p className="text-sm text-slate">
            {scholar}
            {scholar && ruling && " · "}
            {ruling}
          </p>
        )}
      </div>
      <ExternalLink className="size-4 shrink-0 text-teal" aria-label="رابط خارجي" />
    </a>
  );
}

export function DisclosureStrip() {
  return (
    <p className="text-sm leading-6 text-slate">
      أداة مدعومة بالذكاء الاصطناعي. لا تُصدر فتاوى، وإنما تنقل ما نشره أهل العلم مع مصدره.
    </p>
  );
}
