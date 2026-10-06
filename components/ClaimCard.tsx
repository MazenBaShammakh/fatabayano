"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Info, RotateCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { GeneratedBlock, QuotedClaim, ScriptureBlock, SourceRow } from "@/components/Blocks";
import { VerdictChip } from "@/components/VerdictChip";
import type { Claim, ClaimType } from "@/lib/types";

export const TYPE_LABELS: Record<ClaimType, string> = {
  ayah: "آية",
  hadith: "حديث",
  dua: "دعاء",
  attributed_saying: "قول منسوب",
  fiqh: "حكم فقهي",
  out_of_scope: "ادعاء آخر",
};

const ar = (n: number) => n.toLocaleString("ar-EG", { useGrouping: false });

function SearchedList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-sm font-medium text-ink">الجهات التي بحثنا فيها</p>
      <ul className="mt-1 list-disc space-y-0.5 pe-5 text-sm leading-6 text-slate">
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </div>
  );
}

function Hollow({ text, referral, searched }: { text: string; referral?: string; searched?: string[] }) {
  return (
    <div className="space-y-2 rounded-md border-[1.5px] border-dashed border-slate p-3">
      <p className="text-sm leading-7 text-ink">{text}</p>
      {referral && <p className="text-sm leading-7 text-slate">{referral}</p>}
      {searched && <SearchedList items={searched} />}
    </div>
  );
}

function Body({ claim, sourcesSearched }: { claim: Claim; sourcesSearched: string[] }) {
  const first = claim.sources[0];
  switch (claim.verdict) {
    case "ayah_exact":
    case "authentic":
    case "weak":
      return (
        <div className="space-y-2">
          <ScriptureBlock label="النص الموثّق" text={claim.text} {...(claim.reference ? { reference: claim.reference } : {})} />
          {claim.verdict !== "ayah_exact" && first?.ruling && (
            <p className="text-sm text-slate">
              الحكم: {first.ruling}، {first.name}
            </p>
          )}
        </div>
      );
    case "fabricated":
    case "not_hadith":
      return <QuotedClaim label="النص كما ورد في الرسالة" text={claim.text} />;
    case "ayah_misquoted":
      return (
        <div className="space-y-2">
          <QuotedClaim label="النص كما ورد في الرسالة" text={claim.text} />
          {claim.correctedText && (
            <ScriptureBlock label="النص الصحيح" text={claim.correctedText} {...(claim.reference ? { reference: claim.reference } : {})} />
          )}
          <p className="text-sm text-slate">ورد النص في الرسالة بصيغة مختلفة عن المصحف.</p>
        </div>
      );
    case "positions_found":
      return (
        <div className="space-y-3">
          <QuotedClaim label="النص كما ورد في الرسالة" text={claim.text} />
          <ul className="space-y-2">
            {(claim.positions ?? []).map((p) => (
              <li key={p.body + p.url}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-start gap-3 rounded-md border border-line bg-card p-3 hover:border-teal"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{p.body}</p>
                    <p className="text-sm leading-7 text-slate">{p.summary}</p>
                  </div>
                  <ExternalLink className="mt-1 size-4 shrink-0 text-teal" aria-label="رابط خارجي" />
                </a>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate">هذا ما نشرته الجهات المذكورة، وليس حكمًا منّا.</p>
          <SearchedList items={sourcesSearched} />
        </div>
      );
    case "not_found":
    case "ayah_not_found":
      return (
        <div className="space-y-2">
          <QuotedClaim label="النص كما ورد في الرسالة" text={claim.text} />
          <Hollow text="لم نجد مصدرًا مطابقًا. هذا لا يعني أن النص صحيح أو غير صحيح." {...(claim.referral ? { referral: claim.referral } : {})} />
        </div>
      );
    case "none_found":
      return (
        <div className="space-y-2">
          <QuotedClaim label="النص كما ورد في الرسالة" text={claim.text} />
          <Hollow
            text="لم نجد فتوى منشورة في المصادر التي بحثنا فيها. هذا لا يعني أن الادعاء صحيح."
            {...(claim.referral ? { referral: claim.referral } : {})}
            searched={sourcesSearched}
          />
        </div>
      );
    case "out_of_scope":
      return <p className="text-sm text-slate">هذا الادعاء خارج ما نتحقق منه.</p>;
  }
}

export function ClaimCard({
  claim,
  sourcesSearched = [],
  onRetry,
}: {
  claim: Claim;
  sourcesSearched?: string[];
  onRetry?: () => Promise<void> | void;
}) {
  const [retrying, setRetrying] = useState(false);

  if (claim.error) {
    return (
      <article className="flex flex-col gap-3 rounded-xl border border-line bg-card shadow-card p-4">
        <p className="text-[13px] text-slate">{TYPE_LABELS[claim.type]}</p>
        <p className="text-base text-ink">تعذّر التحقق من هذا الادعاء</p>
        <button
          type="button"
          disabled={retrying}
          onClick={async () => {
            setRetrying(true);
            try {
              await onRetry?.();
            } finally {
              setRetrying(false);
            }
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md btn-secondary px-4 text-sm font-medium"
        >
          <RotateCcw className="size-4" aria-hidden />
          {retrying ? "جارٍ إعادة المحاولة…" : "إعادة المحاولة"}
        </button>
      </article>
    );
  }

  return (
    <article className="animate-rise flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-card shadow-card p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-slate">{TYPE_LABELS[claim.type]}</span>
        <VerdictChip verdict={claim.verdict} />
      </header>
      <div className="min-w-0 break-words">
        <Body claim={claim} sourcesSearched={sourcesSearched} />
      </div>
      {claim.generatedExplanation && <GeneratedBlock text={claim.generatedExplanation} />}
      {claim.sources.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="group flex min-h-11 w-full items-center justify-between rounded-md px-1 text-sm font-medium text-teal">
            <span>المصادر ({ar(claim.sources.length)})</span>
            <ChevronDown className="size-4 group-data-[state=open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-1">
            {claim.sources.map((s) => (
              <SourceRow key={s.name + s.url} name={s.name} url={s.url} {...(s.scholar ? { scholar: s.scholar } : {})} {...(s.ruling ? { ruling: s.ruling } : {})} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </article>
  );
}

export function SkeletonCard() {
  return (
    <div aria-hidden className="space-y-3 rounded-xl border border-line bg-card shadow-card p-4">
      <div className="flex justify-between">
        <div className="h-3 w-12 skeleton-shimmer rounded" />
        <div className="h-6 w-20 skeleton-shimmer rounded-full" />
      </div>
      <div className="h-16 skeleton-shimmer rounded-md" />
      <div className="h-3 w-2/3 skeleton-shimmer rounded" />
    </div>
  );
}

export function SummaryStrip({ claims }: { claims: Claim[] }) {
  const counts = new Map<Claim["verdict"], number>();
  let failed = 0;
  for (const c of claims) {
    if (c.error) failed++;
    else counts.set(c.verdict, (counts.get(c.verdict) ?? 0) + 1);
  }
  return (
    <div className="space-y-2 rounded-xl border border-line bg-card shadow-card p-4">
      <p className="text-base font-bold text-ink">الادعاءات: {ar(claims.length)}</p>
      <div className="flex flex-wrap gap-2">
        {[...counts].map(([v, n]) => (
          <VerdictChip key={v} verdict={v} count={n} />
        ))}
        {failed > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate bg-card px-3 py-1 text-[13px] font-medium leading-5 text-ink">
            <Info className="size-4 shrink-0 text-slate" aria-hidden />
            <span>تعذّر التحقق</span>
            <span className="font-bold">({ar(failed)})</span>
          </span>
        )}
      </div>
    </div>
  );
}
