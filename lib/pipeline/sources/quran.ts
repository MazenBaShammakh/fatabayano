import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { arabicDigits, bestAlignment, TokenIndex, tokenize } from "../arabic";

/** Below this word-level similarity we say the ayah was not found rather than misquoted. */
const MISQUOTE_THRESHOLD = 0.6;
/** Lower bar when the model recognised the verse: the claim only has to resemble it. */
const WORDING_THRESHOLD = 0.45;
const CANDIDATES = 8;
/** Verses after the candidate that a quote may run into. */
const SPAN_AFTER = 3;

type QuranFile = { surahs: string[]; verses: [surah: number, ayah: number, imlaei: string, uthmani: string][] };

type Verse = { surah: number; ayah: number; uthmani: string; tokens: string[] };

type QuranIndex = { surahs: string[]; verses: Verse[]; index: TokenIndex };

let loaded: Promise<QuranIndex> | undefined;

function load(): Promise<QuranIndex> {
  loaded ??= readFile(path.join(process.cwd(), "data", "quran.json"), "utf8").then((raw) => {
    const file = JSON.parse(raw) as QuranFile;
    const verses = file.verses.map(([surah, ayah, imlaei, uthmani]) => ({ surah, ayah, uthmani, tokens: tokenize(imlaei) }));
    return { surahs: file.surahs, verses, index: new TokenIndex(verses.map((v) => v.tokens)) };
  });
  return loaded;
}

export type QuranResult =
  | { verdict: "ayah_exact" | "ayah_misquoted"; uthmani: string; reference: string; url: string }
  | { verdict: "ayah_not_found" };

export const QURAN_SOURCE_NAME = "المصحف الشريف";

type Span = { similarity: number; first: number; last: number };

/** Best-matching run of consecutive verses for a token query. */
function locate({ verses, index }: QuranIndex, needle: string[]): Span | undefined {
  let best: Span | undefined;
  for (const id of index.search(needle, CANDIDATES)) {
    // A quote can start before the candidate verse or run past it, so align against a span of verses
    // within the same surah and map the matched window back to the verses it covers.
    const span: number[] = [];
    for (let i = Math.max(0, id - 1); i <= id + SPAN_AFTER && i < verses.length; i++) {
      if (verses[i]!.surah === verses[id]!.surah) span.push(i);
    }
    const offsets: number[] = [];
    const tokens: string[] = [];
    for (const i of span) {
      offsets.push(tokens.length);
      tokens.push(...verses[i]!.tokens);
    }
    const a = bestAlignment(needle, tokens);
    if (best && a.similarity <= best.similarity) continue;
    const verseAt = (pos: number) => span[offsets.findLastIndex((o) => o <= pos)]!;
    best = { similarity: a.similarity, first: verseAt(a.start), last: verseAt(Math.max(a.start, a.end - 1)) };
    if (a.similarity === 1) break;
  }
  return best;
}

/**
 * Finds the verse(s) a claim quotes. `wordings` are canonical texts suggested by the extraction step; they only
 * help locate the verse. Exact vs misquoted is always decided by comparing the claim's own words with the Quran.
 */
export async function matchAyah(text: string, wordings: string[] = []): Promise<QuranResult> {
  const quran = await load();
  const needle = tokenize(text);
  if (!needle.length) return { verdict: "ayah_not_found" };

  const direct = locate(quran, needle);
  let best = direct && direct.similarity >= MISQUOTE_THRESHOLD ? direct : undefined;
  if (!best || best.similarity < 1) {
    for (const w of wordings) {
      const span = locate(quran, tokenize(w));
      // The suggested wording must itself be (nearly) Quran text, otherwise it locates nothing.
      if (!span || span.similarity < 0.9) continue;
      const tokens = quran.verses.slice(span.first, span.last + 1).flatMap((v) => v.tokens);
      const similarity = bestAlignment(needle, tokens).similarity;
      if (similarity >= WORDING_THRESHOLD && (!best || similarity > best.similarity)) best = { ...span, similarity };
    }
  }

  if (!best) return { verdict: "ayah_not_found" };

  const { surahs, verses } = quran;
  const first = verses[best.first]!;
  const last = verses[best.last]!;
  const ayahs = first.ayah === last.ayah ? arabicDigits(first.ayah) : `${arabicDigits(first.ayah)}–${arabicDigits(last.ayah)}`;
  return {
    verdict: best.similarity === 1 ? "ayah_exact" : "ayah_misquoted",
    uthmani: verses
      .slice(best.first, best.last + 1)
      .map((v) => `${v.uthmani} ﴿${arabicDigits(v.ayah)}﴾`)
      .join(" "),
    reference: `${surahs[first.surah - 1]} ${arabicDigits(first.surah)}:${ayahs}`,
    url: `https://quran.com/${first.surah}/${first.ayah === last.ayah ? first.ayah : `${first.ayah}-${last.ayah}`}`,
  };
}
