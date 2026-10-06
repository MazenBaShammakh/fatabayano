"use client";

import Link from "next/link";
import { useState } from "react";
import { isDemoOffline, setDemoOffline, SystemMessage } from "@/components/SystemMessage";
import { PageShell } from "@/components/Layout";
import { ClaimCard } from "@/components/ClaimCard";
import { allDemoClaims, demoSourcesSearched } from "@/mocks/claims";
import { VERDICTS, VerdictChip, type Verdict } from "@/components/VerdictChip";
import { DisclosureStrip, GeneratedBlock, QuotedClaim, ScriptureBlock, SourceRow } from "@/components/Blocks";

function H({ children }: { children: string }) {
  return <h2 className="mt-6 text-lg font-bold text-ink">{children}</h2>;
}

export function DevStates() {
  return (
    <PageShell title="حالات المكونات">
      <H>حالات الفشل والحالات الخاصة</H>
      <FailureStates />
      <H>VerdictChip</H>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(VERDICTS) as Verdict[]).map((v) => (
          <VerdictChip key={v} verdict={v} />
        ))}
        <VerdictChip verdict="authentic" count={3} />
      </div>
      <H>ScriptureBlock</H>
      <ScriptureBlock label="نص الآية من المصحف" text="يَا أَيُّهَا الَّذِينَ آمَنُوا إِن جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا" reference="سورة الحجرات، الآية ٦" />
      <ScriptureBlock label="نص الحديث" text="إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ" />
      <H>QuotedClaim</H>
      <QuotedClaim label="النص كما ورد في الرسالة" text="من نشر هذا الدعاء عشر مرات تحققت أمنيته." />
      <H>GeneratedBlock</H>
      <GeneratedBlock text="هذا النص لم نجده في كتب الحديث المعتمدة التي بحثنا فيها." />
      <H>SourceRow</H>
      <div className="space-y-2">
        <SourceRow name="صحيح البخاري" scholar="الإمام البخاري" ruling="صحيح" url="https://sunnah.com/bukhari:1" />
        <SourceRow name="الدرر السنية" url="https://dorar.net" />
      </div>
      <H>DisclosureStrip</H>
      <DisclosureStrip />
      <H>ClaimCard</H>
      <div className="space-y-3">
        {allDemoClaims.map((c) => (
          <ClaimCard key={c.id} claim={c} sourcesSearched={demoSourcesSearched} />
        ))}
        <ClaimCard claim={{ ...allDemoClaims[0]!, id: "err", error: true }} onRetry={() => new Promise((r) => setTimeout(r, 800))} />
      </div>
    </PageShell>
  );
}

const btn = "inline-flex min-h-11 items-center rounded-md btn-secondary px-4 text-sm font-medium";
const DEMO_LINKS = [
  { demo: "limit", label: "١. الحد المؤقت للاستخدام" },
  { demo: "unreadable", label: "٢. تعذّر قراءة الصورة" },
  { demo: "fail", label: "٣. خطأ غير متوقع" },
  { demo: "badfile", label: "٤. ملف غير صالح" },
  { demo: "partial", label: "٥. فشل جزئي" },
  { demo: "empty", label: "٦. لا توجد ادعاءات" },
] as const;

function FailureStates() {
  const [offline, setOffline] = useState(isDemoOffline());
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DEMO_LINKS.map((d) => (
          <Link key={d.demo} href={`/?demo=${d.demo}`} className={btn}>
            {d.label}
          </Link>
        ))}
        <button
          type="button"
          className={btn}
          aria-pressed={offline}
          onClick={() => {
            setDemoOffline(!offline);
            setOffline(!offline);
          }}
        >
          {offline ? "٧. إيقاف محاكاة انقطاع الاتصال" : "٧. محاكاة انقطاع الاتصال"}
        </button>
        <a href="/missing-page" className={btn}>
          ٨. صفحة غير موجودة
        </a>
      </div>
      <SystemMessage>نموذج لرسالة نظام: بطاقة بيضاء بحدّ رمادي وأيقونة معلومات.</SystemMessage>
    </div>
  );
}
