import { CircleCheck, CircleHelp, CircleX, Info, MinusCircle, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Verdict =
  | "authentic"
  | "weak"
  | "fabricated"
  | "not_hadith"
  | "not_found"
  | "ayah_exact"
  | "ayah_misquoted"
  | "ayah_not_found"
  | "positions_found"
  | "none_found"
  | "out_of_scope";

const solid = {
  teal: "bg-verdict-authentic text-white border-verdict-authentic",
  amber: "bg-verdict-weak text-ink border-verdict-weak",
  rust: "bg-verdict-fabricated text-white border-verdict-fabricated",
  slate: "bg-verdict-not-hadith text-white border-verdict-not-hadith",
  hollow: "bg-transparent text-slate border-[1.5px] border-dashed border-slate",
};

export const VERDICTS: Record<Verdict, { icon: LucideIcon; label: string; style: string }> = {
  authentic: { icon: CircleCheck, label: "ثابت", style: solid.teal },
  weak: { icon: TriangleAlert, label: "ضعيف", style: solid.amber },
  fabricated: { icon: CircleX, label: "موضوع", style: solid.rust },
  not_hadith: { icon: Info, label: "ليس حديثًا", style: solid.slate },
  not_found: { icon: CircleHelp, label: "لم نجده", style: solid.hollow },
  ayah_exact: { icon: CircleCheck, label: "مطابقة تامة", style: solid.teal },
  ayah_misquoted: { icon: TriangleAlert, label: "نص مختلف", style: solid.amber },
  ayah_not_found: { icon: CircleHelp, label: "لم نجد الآية", style: solid.hollow },
  positions_found: { icon: Info, label: "فتاوى منشورة", style: solid.slate },
  none_found: { icon: CircleHelp, label: "لم نجد فتوى منشورة", style: solid.hollow },
  out_of_scope: { icon: MinusCircle, label: "خارج نطاق التحقق", style: solid.hollow },
};

export function VerdictChip({ verdict, count }: { verdict: Verdict; count?: number }) {
  const v = VERDICTS[verdict];
  const Icon = v.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium leading-5",
        v.style,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>{v.label}</span>
      {count !== undefined && <span className="font-bold">({count.toLocaleString("ar-EG")})</span>}
    </span>
  );
}
