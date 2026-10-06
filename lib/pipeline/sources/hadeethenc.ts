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

/**
 * Shortlist of HadeethEnc entries for a claim, best first. Searches with the claim and with any canonical
 * wordings the extraction step suggested, so a paraphrase can still reach the right entry. Whether a candidate
 * is the same hadith is decided later.
 */
export async function findHadithCandidates(text: string, wordings: string[] = []): Promise<HadithCandidate[]> {
  const { records, tokens, index } = await load();
  const needle = tokenize(text);
  if (!needle.length) return [];
  const queries = [needle, ...wordings.map(tokenize).filter((q) => q.length)];

  const ids = new Set(queries.flatMap((q) => index.search(q, CANDIDATES * 4)));
  return [...ids]
    .map((id) => {
      const similarity = bestAlignment(needle, tokens[id]!).similarity;
      // How well the best suggested wording fits this entry; lets a paraphrased claim rank its source first.
      const viaWording = Math.max(0, ...queries.slice(1).map((q) => bestAlignment(q, tokens[id]!).similarity));
      return {
        ...records[id]!,
        similarity,
        exactSimilarity: bestAlignment(needle, tokens[id]!, { soft: false }).similarity,
        claimWords: needle.length,
        rank: Math.max(similarity, viaWording),
      };
    })
    .filter((c) => c.rank >= MIN_SIMILARITY)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, CANDIDATES)
    .map(({ rank: _rank, ...c }) => c);
}
