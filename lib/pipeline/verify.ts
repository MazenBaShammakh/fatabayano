import "server-only";
import type { Claim, Verdict } from "@/lib/types";
import { explainClaim, findFatwaPositions, pickHadithMatch, type ExtractedClaim } from "./llm";
import { matchAyah, QURAN_SOURCE_NAME } from "./sources/quran";
import { findHadithCandidates, HADEETHENC_SOURCE_NAME } from "./sources/hadeethenc";

const REFERRAL = "اسأل مختصًا";

/**
 * Maps a grading published by a hadith source to a verdict. Deliberately a fixed table:
 * a verdict is only ever shown when a source states it.
 */
export function gradeToVerdict(grade: string): Verdict | null {
  // The first line is the grading; later lines are the editors' notes on it.
  const g = firstLine(grade);
  if (/موضوع|مكذوب|باطل/.test(g)) return "fabricated";
  // Mawquf narrations and athar are a Companion's words, not the Prophet's ﷺ, however sound.
  if (/لا أصل له|ليس بحديث|موقوف|الآثار|أثر/.test(g)) return "not_hadith";
  if (/ضعيف|منكر|شاذ/.test(g)) return "weak";
  if (/صحيح|حسن|متفق عليه/.test(g)) return "authentic";
  return null;
}

const firstLine = (s: string) => s.split("\n")[0]!.trim().replace(/[.،]$/, "");

type Verified = { claim: Omit<Claim, "id">; searched: string[] };

async function verifyAyah(text: string): Promise<Verified | null> {
  const q = await matchAyah(text);
  const searched = [QURAN_SOURCE_NAME];
  if (q.verdict === "ayah_not_found") return null;
  const source = { name: QURAN_SOURCE_NAME, url: q.url };
  if (q.verdict === "ayah_exact") {
    return { searched, claim: { type: "ayah", text: q.uthmani, verdict: "ayah_exact", reference: q.reference, sources: [source], abstained: false } };
  }
  return {
    searched,
    claim: { type: "ayah", text, correctedText: q.uthmani, verdict: "ayah_misquoted", reference: q.reference, sources: [source], abstained: false },
  };
}

async function verifyHadith(c: ExtractedClaim): Promise<Verified | null> {
  const match = await pickHadithMatch(c.text, await findHadithCandidates(c.text));
  const verdict = match && gradeToVerdict(match.grade);
  if (!match || !verdict) return null;
  // For a graded match we show the source's text; for fabricated or not-hadith we keep the quoted text.
  const verified = verdict === "authentic" || verdict === "weak";
  return {
    searched: [HADEETHENC_SOURCE_NAME],
    claim: {
      type: c.type,
      text: verified ? match.matn : c.text,
      verdict,
      ...(match.attribution ? { reference: match.attribution } : {}),
      sources: [{ name: HADEETHENC_SOURCE_NAME, url: match.url, ruling: firstLine(match.grade), ...(match.attribution ? { scholar: match.attribution } : {}) }],
      abstained: false,
    },
  };
}

async function verify(c: ExtractedClaim): Promise<Verified> {
  switch (c.type) {
    case "ayah": {
      const found = await verifyAyah(c.text);
      if (found) return found;
      return {
        searched: [QURAN_SOURCE_NAME],
        claim: { type: "ayah", text: c.text, verdict: "ayah_not_found", sources: [], abstained: true, referral: REFERRAL },
      };
    }
    case "hadith":
    case "dua":
    case "attributed_saying": {
      const found = await verifyHadith(c);
      if (found) return found;
      // Messages often present an ayah as a hadith (or quote one unmarked); an exact Quran match settles it.
      const ayah = await verifyAyah(c.text);
      if (ayah?.claim.verdict === "ayah_exact") return { ...ayah, searched: [HADEETHENC_SOURCE_NAME, ...ayah.searched] };
      return {
        searched: [HADEETHENC_SOURCE_NAME, QURAN_SOURCE_NAME],
        claim: { type: c.type, text: c.text, verdict: "not_found", sources: [], abstained: true, referral: REFERRAL },
      };
    }
    case "fiqh": {
      const { positions, searched } = await findFatwaPositions(c.text);
      return {
        searched,
        claim: positions.length
          ? { type: "fiqh", text: c.text, verdict: "positions_found", positions, sources: [], abstained: false }
          : { type: "fiqh", text: c.text, verdict: "none_found", sources: [], abstained: true, referral: REFERRAL },
      };
    }
    case "out_of_scope":
      return { searched: [], claim: { type: "out_of_scope", text: c.text, verdict: "out_of_scope", sources: [], abstained: true } };
  }
}

/** Verifies one extracted claim. Never throws: a failure becomes a claim with error: true that the UI can retry. */
export async function verifyClaim(c: ExtractedClaim, id: string): Promise<{ claim: Claim; searched: string[] }> {
  try {
    const { claim, searched } = await verify(c);
    const evidence = claim.sources.map((s) => [s.name, s.ruling].filter(Boolean).join(": ")).join("\n");
    const explanation = claim.abstained ? undefined : await explainClaim({ text: claim.text, verdict: claim.verdict, evidence });
    return { claim: { id, ...claim, ...(explanation ? { generatedExplanation: explanation } : {}) }, searched };
  } catch (err) {
    console.error("verifyClaim failed", c.type, err);
    return {
      claim: { id, type: c.type, text: c.text, verdict: "not_found", sources: [], abstained: true, error: true },
      searched: [],
    };
  }
}
