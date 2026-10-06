import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { bestAlignment, TokenIndex, tokenize } from "../arabic";

const CANDIDATES = 5;
/** Candidates below this similarity are not worth showing to the matcher. */
const MIN_SIMILARITY = 0.4;

type HadeethFile = {
  hadiths: { id: string; title: string; hadeeth: string; attribution: string; grade: string }[];
};

export type HadithRecord = {
  id: string;
  /** The Prophet's words (the text inside «»), or the full text when there are no quotation marks. */
  matn: string;
  attribution: string;
  grade: string;
  url: string;
};

export type HadithCandidate = HadithRecord & {
  /** Letter-tolerant similarity, used for ranking. */
  similarity: number;
  /** Word-for-word similarity: only identical words count. */
  exactSimilarity: number;
  /** Number of words in the claim. */
  claimWords: number;
};

type HadithIndex = { records: HadithRecord[]; tokens: string[][]; index: TokenIndex };

export const HADEETHENC_SOURCE_NAME = "موسوعة الأحاديث النبوية";

let loaded: Promise<HadithIndex> | undefined;

function extractMatn(text: string): string {
  const quoted = [...text.matchAll(/«([^»]+)»/g)].map((m) => m[1]!.trim());
  return quoted.length ? quoted.join(" … ") : text.trim();
}

function load(): Promise<HadithIndex> {
  loaded ??= readFile(path.join(process.cwd(), "data", "hadeethenc.json"), "utf8").then((raw) => {
    const file = JSON.parse(raw) as HadeethFile;
    const records = file.hadiths.map((h) => ({
      id: h.id,
      matn: extractMatn(h.hadeeth),
      attribution: h.attribution,
      grade: h.grade,
      url: `https://hadeethenc.com/ar/browse/hadith/${h.id}`,
    }));
    const tokens = records.map((r) => tokenize(r.matn));
    return { records, tokens, index: new TokenIndex(tokens) };
  });
  return loaded;
}

/** Lexical shortlist of HadeethEnc entries for a claim, best first. Whether one is the same hadith is decided later. */
export async function findHadithCandidates(text: string): Promise<HadithCandidate[]> {
  const { records, tokens, index } = await load();
  const needle = tokenize(text);
  if (!needle.length) return [];
  return index
    .search(needle, CANDIDATES * 4)
    .map((id) => ({
      ...records[id]!,
      similarity: bestAlignment(needle, tokens[id]!).similarity,
      exactSimilarity: bestAlignment(needle, tokens[id]!, { soft: false }).similarity,
      claimWords: needle.length,
    }))
    .filter((c) => c.similarity >= MIN_SIMILARITY)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, CANDIDATES);
}
