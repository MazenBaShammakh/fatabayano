"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useEffectEvent, useRef, useState } from "react";
import { Image as ImageIcon, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { analyze, RateLimitError, ImageReadError, retryClaim as retryClaimRequest } from "@/lib/api";
import type { Claim } from "@/lib/types";
import { ShareFlow } from "@/components/ShareFlow";
import { ClaimCard, SkeletonCard, SummaryStrip } from "@/components/ClaimCard";
import { DisclosureStrip } from "@/components/Blocks";
import { SystemMessage } from "@/components/SystemMessage";

const MAX_CHARS = 3000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const FILE_ERROR = "اختر صورة بصيغة PNG أو JPG أو WebP لا يزيد حجمها عن ٥ ميغابايت.";

const arabicDigits = (n: number) => n.toLocaleString("ar-EG", { useGrouping: false });

type Demo = "limit" | "unreadable" | "fail" | "empty" | "partial" | "badfile";
const DEMOS: Demo[] = ["limit", "unreadable", "fail", "empty", "partial", "badfile"];

/** Demo-only: reads ?demo=… in its own Suspense boundary so the rest of the page stays prerendered. */
function DemoParam({ onDemo }: { onDemo: (demo: Demo) => void }) {
  const value = useSearchParams().get("demo");
  const demo = DEMOS.includes(value as Demo) ? (value as Demo) : null;
  const handleDemo = useEffectEvent(onDemo);
  useEffect(() => {
    if (demo) handleDemo(demo);
  }, [demo]);
  return null;
}

/** Demo-only: a small plain image used by /dev/states to preview the unreadable-image state. */
async function demoImage(): Promise<File> {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#D8D6CC";
  ctx.fillRect(0, 0, 64, 64);
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/png"));
  return new File([blob], "demo.png", { type: "image/png" });
}

export function HomePage() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [emptyError, setEmptyError] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [imageReadError, setImageReadError] = useState(false);
  const [retryUntil, setRetryUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [checking, setChecking] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [searched, setSearched] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const [submitted, setSubmitted] = useState("");
  const lastInput = useRef<{ text?: string; image?: File }>({});
  const runId = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limitRef = useRef<HTMLDivElement>(null);

  const overLimit = text.length > MAX_CHARS;
  const secondsLeft = retryUntil ? Math.max(0, Math.ceil((retryUntil - now) / 1000)) : 0;

  useEffect(() => {
    if (!retryUntil) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= retryUntil) setRetryUntil(null);
    }, 1000);
    return () => clearInterval(t);
  }, [retryUntil]);

  const setAttached = (file: File) => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImage(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const attachImage = (file: File | undefined | null) => {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setFileError(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFileError(false);
    setImageReadError(false);
    setAttached(file);
    setEmptyError(false);
  };

  const removeImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImage(null);
    setImageUrl(null);
    setImageReadError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = e.clipboardData.files[0];
    if (file && file.type.startsWith("image/")) attachImage(file);
  };

  const run = (input: { text?: string; image?: File }) => {
    lastInput.current = input;
    setChecking(true);
    setClaims([]);
    setDone(false);
    setFailed(false);
    setSubmitted(input.text ?? "");
    const id = ++runId.current;
    analyze(
      input,
      (c) => id === runId.current && setClaims((prev) => [...prev, c]),
      (s) => {
        if (id !== runId.current) return;
        setSearched(s);
        setDone(true);
      },
    ).catch((err: unknown) => {
      if (id !== runId.current) return;
      if (err instanceof RateLimitError) {
        setChecking(false);
        const until = Date.now() + err.retryAfterSeconds * 1000;
        setNow(Date.now());
        setRetryUntil(until);
        setTimeout(() => limitRef.current?.focus(), 0);
      } else if (err instanceof ImageReadError) {
        setChecking(false);
        setImageReadError(true);
        setTimeout(() => textareaRef.current?.focus(), 0);
      } else {
        setDone(true);
        setFailed(true);
      }
    });
  };

  const submitWith = (t: string, img: File | null) => {
    if (retryUntil && Date.now() < retryUntil) {
      limitRef.current?.focus();
      return;
    }
    if (!t.trim() && !img) {
      setEmptyError(true);
      textareaRef.current?.focus();
      return;
    }
    if (t.length > MAX_CHARS) return;
    setEmptyError(false);
    setImageReadError(false);
    const input: { text?: string; image?: File } = {};
    if (t.trim()) input.text = t.trim();
    if (img) input.image = img;
    run(input);
  };

  const onSubmit = () => submitWith(text, image);

  // Demo-only: /dev/states links here with ?demo=… to preview each state.
  const runDemo = (demo: Demo) => {
    if (demo === "badfile") {
      setFileError(true);
      return;
    }
    const tag = `[${demo}]`;
    setText(tag);
    if (demo === "unreadable") {
      void demoImage().then((f) => {
        setAttached(f);
        submitWith(tag, f);
      });
    } else submitWith(tag, null);
  };

  const reset = () => {
    runId.current++;
    setChecking(false);
    setClaims([]);
    setSearched([]);
    setDone(false);
    setFailed(false);
    setText("");
    removeImage();
  };

  const retryClaim = async (index: number) => {
    const claim = claims[index];
    if (!claim) return;
    try {
      const updated = await retryClaimRequest(claim);
      if (updated.error) toast("تعذّر التحقق من هذا الادعاء. حاول مرة أخرى لاحقًا.");
      setClaims((prev) => prev.map((c, i) => (i === index ? updated : c)));
    } catch (err) {
      toast(err instanceof RateLimitError ? "وصلت إلى الحد المؤقت للاستخدام. حاول بعد قليل." : "تعذّر التحقق من هذا الادعاء. حاول مرة أخرى.");
    }
  };

  const demoParam = (
    <Suspense fallback={null}>
      <DemoParam onDemo={runDemo} />
    </Suspense>
  );

  if (checking) {
    const preview = submitted.length > 80 ? submitted.slice(0, 80) + "…" : submitted;
    return (
      <div className="space-y-4">
        {demoParam}
        <h1 className="sr-only">نتيجة التحقق</h1>
        <section className="flex items-center gap-3 rounded-xl border border-line bg-card shadow-card p-3">
          {imageUrl && !preview && <img src={imageUrl} alt="الصورة المرفقة" className="size-11 shrink-0 rounded-lg object-cover" />}
          <p className="min-w-0 flex-1 truncate text-sm text-slate">{preview || (imageUrl ? "صورة مرفقة" : "")}</p>
          <button type="button" onClick={reset} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-medium text-teal hover:underline">
            رسالة جديدة
          </button>
        </section>
        <div aria-live="polite" aria-busy={!done} className="space-y-4">
        {claims.length > 0 && <SummaryStrip claims={claims} />}
        {claims.map((c, i) => (
          <ClaimCard key={c.id + i} claim={c} sourcesSearched={searched} onRetry={() => retryClaim(i)} />
        ))}
        </div>
        {!done && <SkeletonCard />}
        {done && !failed && claims.length === 0 && (
          <SystemMessage
            action={
              <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-md btn-secondary px-4 text-sm font-medium">
                جرّب رسالة أخرى
              </button>
            }
          >
            لم نجد آيات أو أحاديث أو أدعية أو أحكامًا في هذه الرسالة.
          </SystemMessage>
        )}
        {failed && (
          <SystemMessage
            action={
              <button type="button" onClick={() => run(lastInput.current)} className="inline-flex min-h-11 items-center gap-2 rounded-md btn-secondary px-4 text-sm font-medium">
                <RotateCcw className="size-4" aria-hidden />
                إعادة المحاولة
              </button>
            }
          >
            حدث خطأ غير متوقع. حاول مرة أخرى.
          </SystemMessage>
        )}
        <div aria-live="polite" className="sr-only">{done && !failed ? "اكتمل التحقق" : ""}</div>
        {done && !failed && claims.some((c) => !c.error) && <ShareFlow claims={claims} sourcesSearched={searched} />}
        <DisclosureStrip />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {demoParam}
      {/* Hero */}
      <section className="space-y-3">
        <h1 className="text-[28px] font-bold leading-snug text-ink">تحقّق قبل أن تنشر</h1>
        <p className="text-base leading-7 text-slate">
          الصق الرسالة أو ارفع صورتها، ونبيّن لك ما نشره أهل العلم عن الآيات والأحاديث والأدعية فيها.
        </p>
      </section>

      {retryUntil && secondsLeft > 0 && (
        <div ref={limitRef} tabIndex={-1} className="focus-visible:outline-2 focus-visible:outline-teal rounded-xl">
          <SystemMessage>
            وصلت إلى الحد المؤقت للاستخدام. حاول مرة أخرى بعد {arabicDigits(secondsLeft)} ثانية.
          </SystemMessage>
        </div>
      )}

      {/* Input card */}
      <section className="rounded-xl border border-line bg-card shadow-card p-4 input-glow">
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            dir="rtl"
            rows={6}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) setEmptyError(false);
            }}
            onPaste={onPaste}
            placeholder="الصق الرسالة هنا"
            className="w-full resize-y rounded-md border border-line bg-paper p-3 text-base leading-7 text-ink placeholder:text-slate focus:border-teal focus:outline-none"
            aria-label="نص الرسالة"
          />
          <p className={`text-sm ${overLimit ? "font-medium text-[#B8400B]" : "text-slate"}`}>
            {arabicDigits(text.length)} / {arabicDigits(MAX_CHARS)}
            {overLimit && <span className="block">النص أطول من الحد المسموح</span>}
          </p>
          {imageReadError && (
            <SystemMessage>لم نتمكن من قراءة النص في الصورة. جرّب صورة أوضح أو الصق النص.</SystemMessage>
          )}
          {fileError && <SystemMessage>{FILE_ERROR}</SystemMessage>}
          {emptyError && (
            <p role="alert" className="text-sm font-medium text-[#B8400B]">
              اكتب نصًا أو ارفع صورة أولًا
            </p>
          )}
        </div>

        {image && imageUrl && (
          <div className="mt-3 space-y-1">
            <div className="relative inline-block">
              <img src={imageUrl} alt="الصورة المرفقة" className="size-16 rounded-lg object-cover" />
              <button
                type="button"
                onClick={removeImage}
                aria-label="إزالة الصورة"
                className="absolute -end-3 -top-3 flex size-11 items-center justify-center text-ink"
              >
                <span className="flex size-6 items-center justify-center rounded-full border border-line bg-card"><X className="size-3.5" aria-hidden /></span>
              </button>
            </div>
            <p className="text-xs text-slate">تُعالج الصورة مؤقتًا ولا نحفظها.</p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => attachImage(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md btn-secondary px-4 text-sm font-medium"
          >
            <ImageIcon className="size-4" />
            رفع صورة
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-md btn-primary px-4 text-sm font-bold"
          >
            تحقّق
          </button>
        </div>

      </section>

      {/* Scope lists */}
      <section className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-base font-bold text-ink">ما نتحقق منه</h2>
          <ul className="mt-2 list-disc space-y-1 pe-5 text-sm leading-7 text-slate">
            <li>آيات القرآن</li>
            <li>الأحاديث والأدعية</li>
            <li>الأقوال المنسوبة إلى النبي ﷺ</li>
            <li>ما نشرته الجهات العلمية عن الحلال والحرام</li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-bold text-ink">ما لا نفعله</h2>
          <ul className="mt-2 list-disc space-y-1 pe-5 text-sm leading-7 text-slate">
            <li>لا نُصدر فتاوى</li>
            <li>لا نحكم على الأشخاص</li>
            <li>لا نجيب عن الحالات الشخصية</li>
          </ul>
        </div>
      </section>

      {/* Disclosure */}
      <section className="space-y-2">
        <DisclosureStrip />
        <p className="text-sm leading-6 text-slate">
          لا نحفظ رسالتك ولا صورتها في خوادمنا.{" "}
          <Link href="/privacy" className="text-teal underline-offset-4 hover:underline">
            سياسة الخصوصية
          </Link>
        </p>
      </section>
    </div>
  );
}
