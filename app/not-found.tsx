import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-ink">لم نجد هذه الصفحة.</h1>
        <p className="mt-3 text-slate">ربما تغيّر الرابط أو لم يعد متاحًا. يمكنك البدء من الصفحة الرئيسية.</p>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-md btn-primary px-5">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
