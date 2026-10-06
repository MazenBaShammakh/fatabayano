"use client";

import { useState } from "react";
import { Copy, Loader2, MessageCircle, Share, Share2 } from "lucide-react";
import { toast } from "sonner";
import { createCard } from "@/lib/api";
import type { Claim } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { VerdictChip } from "@/components/VerdictChip";
import { TYPE_LABELS } from "@/components/ClaimCard";

const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2";
const primary = `${btn} btn-primary font-bold`;
const secondary = `${btn} btn-secondary`;

function SheetBody({
  claims,
  link,
  failed,
  onRetry,
}: {
  claims: Claim[];
  link: string | null;
  failed: boolean;
  onRetry: () => void;
}) {
  if (failed) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm leading-7 text-ink">تعذّر إنشاء الرابط. حاول مرة أخرى.</p>
        <button type="button" onClick={onRetry} className={secondary}>إعادة المحاولة</button>
      </div>
    );
  }
  if (!link) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("تم نسخ الرابط");
    } catch {
      toast("تعذّر النسخ. انسخ الرابط يدويًا.");
    }
  };
  const wa = `https://wa.me/?text=${encodeURIComponent("نتيجة التحقق من فتبيّنوا: " + link)}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="share-link" className="sr-only">رابط البطاقة</label>
        <input
          id="share-link"
          readOnly
          dir="ltr"
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink focus:border-teal focus:outline-none"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={copy} className={primary}>
            <Copy className="size-4" aria-hidden /> نسخ الرابط
          </button>
          <a href={wa} target="_blank" rel="noopener noreferrer" className={secondary}>
            <MessageCircle className="size-4" aria-hidden /> إرسال عبر واتساب
          </a>
          {canShare && (
            <button
              type="button"
              onClick={() => navigator.share({ title: "فتبيّنوا", url: link }).catch(() => {})}
              className={secondary}
            >
              <Share className="size-4" aria-hidden /> مشاركة…
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-ink">محتوى البطاقة</p>
        <ul className="space-y-2">
          {claims.map((c, i) => (
            <li key={c.id + i} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-card p-2">
              <span className="text-[13px] text-slate">{TYPE_LABELS[c.type]}</span>
              <VerdictChip verdict={c.verdict} />
            </li>
          ))}
        </ul>
        <p className="text-sm leading-6 text-slate">تحتوي البطاقة على النصوص الموثقة والأحكام فقط، دون رسالتك الأصلية ودون الصورة.</p>
        <p className="text-sm leading-6 text-slate">تنتهي صلاحية الرابط بعد مدة.</p>
      </div>
    </div>
  );
}

/** Share button + sheet. Receives only resolved claims — never the original message or image. */
export function ShareFlow({ claims, sourcesSearched }: { claims: Claim[]; sourcesSearched: string[] }) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const resolved = claims.filter((c) => !c.error);

  const create = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const { id } = await createCard(resolved, sourcesSearched);
      setLink(`${window.location.origin}/c/${id}`);
    } catch {
      setLink(null);
      setFailed(true);
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  const button = (cls: string) => (
    <button type="button" onClick={create} disabled={loading} aria-busy={loading} className={cls}>
      {loading ? <Loader2 className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}
      {loading ? "جارٍ إنشاء الرابط…" : "شارك النتيجة"}
    </button>
  );

  const body = <SheetBody claims={resolved} link={link} failed={failed} onRetry={create} />;

  return (
    <>
      {button(`${primary} w-full`)}
      <div className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-center border-t border-line bar-glass px-4 sm:hidden">
        {button(`${primary} w-full`)}
      </div>
      <div className="h-14 sm:hidden" aria-hidden />
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent dir="rtl" className="bg-paper shadow-card">
            <DrawerHeader className="text-start">
              <DrawerTitle>شارك النتيجة</DrawerTitle>
              <DrawerDescription className="sr-only">رابط بطاقة النتيجة</DrawerDescription>
            </DrawerHeader>
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">{body}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto bg-paper shadow-card">
            <DialogHeader className="text-start">
              <DialogTitle>شارك النتيجة</DialogTitle>
              <DialogDescription className="sr-only">رابط بطاقة النتيجة</DialogDescription>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
