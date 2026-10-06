"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">تعذّر تحميل هذه الصفحة.</h1>
        <p className="mt-2 text-sm text-slate">حدث خطأ غير متوقع. حاول مرة أخرى، أو عُد إلى الصفحة الرئيسية.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => retry()}
            className="inline-flex min-h-11 items-center justify-center rounded-md btn-primary px-4 text-sm font-medium"
          >
            حاول مرة أخرى
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md btn-secondary px-4 text-sm font-medium"
          >
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
