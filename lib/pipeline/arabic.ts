/**
 * Arabic text normalization and fuzzy matching shared by the knowledge tools.
 * Everything here is deterministic: matching decides verdicts, so it must be reproducible.
 */

// Harakat, tanween, shadda, sukun, superscript alef, Quranic annotation marks.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g;
const TATWEEL = /ـ/g;

export function normalizeArabic(text: string): string {
  return text
    .replace(DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeArabic(text);
  // A leading و/ف before the article is a conjunction (والصلاة → الصلاة), so quotes that start mid-sentence still line up.
  return normalized ? normalized.split(" ").map((w) => (/^[وف]ال../.test(w) ? w.slice(1) : w)) : [];
}

/** Generic edit distance; `cost` prices a substitution between 0 (same) and 1 (unrelated). */
function editDistance<T>(a: ArrayLike<T>, b: ArrayLike<T>, cost: (x: T, y: T) => number): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost(a[i - 1]!, b[j - 1]!));
    }
    prev = curr;
  }
  return prev[b.length]!;
}

/**
 * Word substitution cost from letter-level similarity, so a near-miss word (فتبينوا / فتثبتوا) counts
 * as partly right instead of wholly wrong. Memoized per alignment since the same pairs recur across windows.
 */
function wordCost(memo: Map<string, number>) {
  return (x: string, y: string) => {
    if (x === y) return 0;
    const key = `${x} ${y}`;
    let c = memo.get(key);
    if (c === undefined) {
      c = editDistance(x, y, (p, q) => (p === q ? 0 : 1)) / Math.max(x.length, y.length);
      memo.set(key, c);
    }
    return c;
  };
}

export type Alignment = { similarity: number; start: number; end: number };

/**
 * Best match of `needle` anywhere inside `haystack` (both token arrays).
 * Slides windows of roughly the needle's length so a partial quote of a long text still scores high.
 * similarity is 1 for an exact contiguous match and falls toward 0 as words differ.
 */
export function bestAlignment(needle: string[], haystack: string[], { soft = true } = {}): Alignment {
  let best: Alignment = { similarity: 0, start: 0, end: 0 };
  if (!needle.length || !haystack.length) return best;
  // soft: near-miss words count as partly right (good for ranking). Hard: only identical words count.
  const cost = soft ? wordCost(new Map()) : (x: string, y: string) => (x === y ? 0 : 1);
  const slack = Math.max(1, Math.round(needle.length * 0.2));
  for (let len = Math.max(1, needle.length - slack); len <= needle.length + slack; len++) {
    for (let start = 0; start + len <= haystack.length || start === 0; start++) {
      const end = Math.min(start + len, haystack.length);
      const window = haystack.slice(start, end);
      const similarity = 1 - editDistance(needle, window, cost) / Math.max(needle.length, window.length);
      if (similarity > best.similarity) best = { similarity, start, end };
      if (best.similarity === 1) return best;
      if (end === haystack.length) break;
    }
  }
  return best;
}

/** Inverted index over token documents, ranked by IDF-weighted overlap. Used to shortlist candidates. */
export class TokenIndex {
  private readonly postings = new Map<string, number[]>();
  private readonly docCount: number;

  constructor(docs: string[][]) {
    this.docCount = docs.length;
    docs.forEach((tokens, id) => {
      for (const t of new Set(tokens)) {
        const list = this.postings.get(t);
        if (list) list.push(id);
        else this.postings.set(t, [id]);
      }
    });
  }

  search(tokens: string[], limit: number): number[] {
    const scores = new Map<number, number>();
    for (const t of new Set(tokens)) {
      const list = this.postings.get(t);
      if (!list) continue;
      const idf = Math.log(1 + this.docCount / list.length);
      for (const id of list) scores.set(id, (scores.get(id) ?? 0) + idf);
    }
    return [...scores]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }
}

/** Arabic-Indic digits without grouping, e.g. 255 → ٢٥٥. */
export const arabicDigits = (n: number) => n.toLocaleString("ar-EG", { useGrouping: false });
