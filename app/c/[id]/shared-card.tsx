"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Link as LinkIcon, RotateCcw } from "lucide-react";
import { CardExpiredError, getCard } from "@/lib/api";
import type { ShareCard } from "@/lib/types";
import { ClaimCard, SkeletonCard, SummaryStrip } from "@/components/ClaimCard";
import { DisclosureStrip } from "@/components/Blocks";

type Status = "loading" | "ready" | "gone" | "error";

function formatArabicDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

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

function PrimaryHomeButton({ label }: { label: string }) {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 w-full items-center justify-center rounded-md btn-primary px-4 text-sm font-bold sm:w-auto"
    >
      {label}
    </Link>
  );
}

function GoneView() {
  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <p className="max-w-sm text-base leading-7 text-ink">
        انتهت صلاحية هذه البطاقة أو لم تعد متاحة.
      </p>
      <PrimaryHomeButton label="تحقّق من رسالة جديدة" />
    </div>
  );
}

export function SharedCard({ id }: { id: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [card, setCard] = useState<ShareCard | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getCard(id)
      .then((result) => {
        if (!active) return;
        if (result) {
          setCard(result);
          setStatus("ready");
        } else {
          setStatus("gone");
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        // An expired card is not an error; it gets the same quiet message as a missing one.
        if (err instanceof CardExpiredError) {
          setStatus("gone");
        } else {
          setStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const retry = useCallback(() => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }, []);

  if (status === "loading") {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="h-5 w-48 skeleton-shimmer rounded" />
        <SkeletonCard />
        <SkeletonCard />
        <span className="sr-only">جارٍ تحميل البطاقة…</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <p className="text-base leading-7 text-ink">تعذّر تحميل البطاقة</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md btn-secondary px-4 text-sm font-medium"
        >
          <RotateCcw className="size-4" aria-hidden />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (status === "gone" || !card) {
    return <GoneView />;
  }

  const dateLine = formatArabicDate(card.createdAt);

  return (
    <div className="space-y-4">
      {/* Shared-result strip */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate">
        <LinkIcon className="size-4 shrink-0" aria-hidden />
        <h1 className="text-sm font-normal">نتيجة تحقق مُشارَكة</h1>
        {dateLine && <span>· {dateLine}</span>}
      </div>

      <SummaryStrip claims={card.claims} />

      {card.claims.map((claim, i) => (
        <ClaimCard key={claim.id + i} claim={claim} sourcesSearched={card.sourcesSearched} />
      ))}

      {card.claims.length === 0 && (
        <div className="rounded-xl border-[1.5px] border-dashed border-slate p-4 text-sm leading-7 text-ink">
          لم نجد في الرسالة آيات أو أحاديث أو أدعية أو أحكامًا نتحقق منها.
        </div>
      )}

      <SearchedList items={card.sourcesSearched} />

      <DisclosureStrip />

      <PrimaryHomeButton label="تحقّق من رسالة أخرى" />
    </div>
  );
}
