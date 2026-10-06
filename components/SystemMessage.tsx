"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info, WifiOff } from "lucide-react";

/** Neutral system message: white card, 1px slate border, Info icon. Not a verdict. */
export function SystemMessage({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-slate bg-card p-4 text-sm leading-7 text-ink">
      <Info className="mt-1 size-5 shrink-0 text-slate" aria-hidden />
      <div className="min-w-0 flex-1 space-y-3">
        <div>{children}</div>
        {action}
      </div>
    </div>
  );
}

// Demo-only switch so /dev/states can preview the offline banner.
let forced = false;
const listeners = new Set<() => void>();
export function setDemoOffline(v: boolean) {
  forced = v;
  listeners.forEach((l) => l());
}
export function isDemoOffline() {
  return forced;
}

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(forced || !navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    listeners.add(update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      listeners.delete(update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div role="status" className="border-b border-slate bg-card">
      <p className="mx-auto flex min-h-11 max-w-[720px] items-center gap-2 px-4 text-sm text-ink">
        <WifiOff className="size-4 shrink-0 text-slate" aria-hidden />
        لا يوجد اتصال بالإنترنت. تحقّق من الاتصال، وسيعمل التحقق عند عودته.
      </p>
    </div>
  );
}
