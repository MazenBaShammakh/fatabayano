import "server-only";
import type { Claim, ClaimType, Verdict } from "@/lib/types";
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

/** Result of one lookup. `found` is false when the source has nothing on the claim. */
type Lookup = { found: boolean; claim: Omit<Claim, "id">; searched: string[] };

async function lookupAyah(c: ExtractedClaim): Promise<Lookup> {
  const q = await matchAyah(c.text, c.wordings);
  const searched = [QURAN_SOURCE_NAME];
  if (q.verdict === "ayah_not_found") {
    return { found: false, searched, claim: { type: "ayah", text: c.text, verdict: "ayah_not_found", sources: [], abstained: true, referral: REFERRAL } };
  }
  const source = { name: QURAN_SOURCE_NAME, url: q.url };
  return {
    found: true,
    searched,
    claim:
      q.verdict === "ayah_exact"
        ? { type: "ayah", text: q.uthmani, verdict: "ayah_exact", reference: q.reference, sources: [source], abstained: false }
        : { type: "ayah", text: c.text, correctedText: q.uthmani, verdict: "ayah_misquoted", reference: q.reference, sources: [source], abstained: false },
  };
}

async function lookupHadith(c: ExtractedClaim, type: ClaimType): Promise<Lookup> {
  const searched = [HADEETHENC_SOURCE_NAME];
  const match = await pickHadithMatch(c.text, await findHadithCandidates(c.text, c.wordings));
  const verdict = match && gradeToVerdict(match.grade);
  if (!match || !verdict) {
    return { found: false, searched, claim: { type, text: c.text, verdict: "not_found", sources: [], abstained: true, referral: REFERRAL } };
  }
  // For a graded match we show the source's text; for fabricated or not-hadith we keep the quoted text.
  const verified = verdict === "authentic" || verdict === "weak";
  return {
    found: true,
    searched,
    claim: {
      type,
      text: verified ? match.matn : c.text,
      verdict,
      ...(match.attribution ? { reference: match.attribution } : {}),
      sources: [{ name: HADEETHENC_SOURCE_NAME, url: match.url, ruling: firstLine(match.grade), ...(match.attribution ? { scholar: match.attribution } : {}) }],
      abstained: false,
    },
  };
}

async function lookupFiqh(c: ExtractedClaim): Promise<Lookup> {
  const { positions, searched } = await findFatwaPositions(c.text);
  return positions.length
    ? { found: true, searched, claim: { type: "fiqh", text: c.text, verdict: "positions_found", positions, sources: [], abstained: false } }
    : { found: false, searched, claim: { type: "fiqh", text: c.text, verdict: "none_found", sources: [], abstained: true, referral: REFERRAL } };
}

/** The knowledge tool for one claim type. */
function lookup(c: ExtractedClaim, type: ClaimType): Promise<Lookup> {
  switch (type) {
    case "ayah":
      return lookupAyah(c);
    case "hadith":
    case "dua":
    case "attributed_saying":
      return lookupHadith(c, type);
    case "fiqh":
      return lookupFiqh(c);
    case "out_of_scope":
      return Promise.resolve({ found: true, searched: [], claim: { type, text: c.text, verdict: "out_of_scope", sources: [], abstained: true } });
  }
}

/**
 * Runs one lookup per candidate type in parallel (a text the model marked as "dua or ayah" is checked against
 * both the hadith data and the Quran) and keeps the first type, in the model's order, whose source has it.
 * If none has it, the most likely type's "not found" result is shown.
 */
async function verify(c: ExtractedClaim): Promise<Lookup> {
  // Messages often present an ayah as a hadith, so a hadith-like claim is also checked against the Quran even
  // when the model did not suggest it. That extra check only counts on an exact match.
  const extraAyah = !c.types.includes("ayah") && c.types.some((t) => t === "hadith" || t === "dua");
  const types: ClaimType[] = extraAyah ? [...c.types, "ayah"] : c.types;
  const settled = await Promise.allSettled(types.map((t) => lookup(c, t)));
  const searched = settled.flatMap((s) => (s.status === "fulfilled" ? s.value.searched : []));
  const found = settled.find(
    (s, i) => s.status === "fulfilled" && s.value.found && !(extraAyah && i === types.length - 1 && s.value.claim.verdict !== "ayah_exact"),
  );
  if (found?.status === "fulfilled") return { ...found.value, searched };
  const primary = settled[0]!;
  if (primary.status === "rejected") throw primary.reason;
  return { ...primary.value, searched };
}

/** Verifies one extracted claim. Never throws: a failure becomes a claim with error: true that the UI can retry. */
export async function verifyClaim(c: ExtractedClaim, id: string): Promise<{ claim: Claim; searched: string[] }> {
  try {
    const { claim, searched } = await verify(c);
    const evidence = claim.sources.map((s) => [s.name, s.ruling].filter(Boolean).join(": ")).join("\n");
    const explanation = claim.abstained ? undefined : await explainClaim({ text: claim.text, verdict: claim.verdict, evidence });
    return { claim: { id, ...claim, ...(explanation ? { generatedExplanation: explanation } : {}) }, searched: [...new Set(searched)] };
  } catch (err) {
    console.error("verifyClaim failed", c.type, err);
    return {
      claim: { id, type: c.type, text: c.text, verdict: "not_found", sources: [], abstained: true, error: true },
      searched: [],
    };
  }
}
