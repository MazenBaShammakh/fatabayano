import "server-only";
import type { ClaimType, Position } from "@/lib/types";
import type { HadithCandidate } from "./sources/hadeethenc";

/**
 * Every LLM call in the pipeline goes through this module, so switching to Gemini touches only this file.
 *
 * Everything below is a STUB: no model is called yet. Each stub either uses a cheap deterministic
 * heuristic (so the pipeline runs end to end) or throws LlmUnavailableError (so the UI shows an
 * honest "couldn't verify" state instead of invented data).
 *
 * The LLM never decides a verdict. It finds claims and judges whether retrieved text matches;
 * verdicts come from source data in verify.ts.
 */

export class LlmUnavailableError extends Error {
  constructor(task: string) {
    super(`llm_unavailable:${task}`);
    this.name = "LlmUnavailableError";
  }
}

export type ExtractedClaim = { type: ClaimType; text: string };

/**
 * OCR for screenshots of forwarded messages.
 * STUB(gemini): send the image to a Gemini Flash model and return the message text verbatim.
 */
export async function readImageText(_image: Blob): Promise<string> {
  throw new LlmUnavailableError("ocr");
}

const AYAH_INTRO = /(?:قال|يقول)\s+(?:الله\s+)?(?:تعالى|عز وجل|سبحانه(?:\s+وتعالى)?)\s*[:：]?\s*/;
const HADITH_INTRO = /(?:قال|يقول|عن)\s+(?:رسول الله|النبي|الرسول)\s*(?:ﷺ|صلى الله عليه وسلم|عليه الصلاة والسلام)?\s*(?:قال|أنه قال)?\s*[:：]?\s*/;
const FIQH_HINT = /(?:حرام|حلال|يجوز|لا يجوز|بدعة|واجب|مكروه|مستحب|سنة مؤكدة|فرض)/;
const TRAILING_REF = /\s*[(\[]?\s*(?:رواه|أخرجه|متفق عليه)[^)\]\n]*[)\]]?\s*[.،]?\s*$/;

function clean(text: string): string {
  return text.replace(TRAILING_REF, "").replace(/^[\s"“”'.:،-]+|[\s"“”'.:،-]+$/g, "");
}

/**
 * Splits a message into checkable claims and labels each one's type.
 * STUB(gemini): replace with a single Gemini Flash call using structured output
 * (a JSON schema for ExtractedClaim[]). Until then this heuristic reads explicit markers:
 * ﴿…﴾ and "قال تعالى" for ayahs, «…» and "قال رسول الله" for hadith, "اللهم" for duas,
 * and words like حرام/يجوز for fiqh claims.
 */
export async function extractClaims(message: string): Promise<ExtractedClaim[]> {
  const claims: ExtractedClaim[] = [];
  const add = (type: ClaimType, text: string) => {
    const t = clean(text);
    if (t.split(/\s+/).length >= 2 && !claims.some((c) => c.text === t)) claims.push({ type, text: t });
  };

  let rest = message;
  for (const m of message.matchAll(/﴿([^﴾]+)﴾/g)) {
    add("ayah", m[1]!);
    rest = rest.replace(m[0], "\n");
  }
  for (const m of rest.matchAll(/«([^»]+)»/g)) {
    add("hadith", m[1]!);
    rest = rest.replace(m[0], "\n");
  }

  for (const line of rest.split(/\n+|(?<=[.!؟])\s+/)) {
    const ayah = line.match(AYAH_INTRO);
    const hadith = line.match(HADITH_INTRO);
    if (ayah?.index !== undefined) add("ayah", line.slice(ayah.index + ayah[0].length));
    else if (hadith?.index !== undefined) add("hadith", line.slice(hadith.index + hadith[0].length));
    else if (/^\s*اللهم/.test(line)) add("dua", line);
    else if (FIQH_HINT.test(line)) add("fiqh", line);
  }

  // No markers at all: treat the whole message as one text to look up. verify.ts also tries
  // the Quran when a hadith lookup fails, so an unmarked ayah is still recognised.
  if (!claims.length && message.trim()) add("hadith", message.slice(0, 600));
  return claims;
}

/**
 * Decides which retrieved HadeethEnc entry, if any, is the same hadith as the claim
 * (allowing for paraphrase and partial quotes), or null when none is.
 * STUB(gemini): ask Gemini to compare the claim with each candidate and return the matching id or none.
 *
 * Until then: accept only a verbatim match, or a near word-for-word one of four words or more. Deliberately
 * conservative. Lexical similarity cannot tell a spelling variant from a swapped word
 * (النظافة من الإيمان vs the authentic البذاذة من الإيمان differ by one word), and a false
 * "authentic" is far worse than a "not found". Expect some genuine variants to come back not found.
 */
export async function pickHadithMatch(_claim: string, candidates: HadithCandidate[]): Promise<HadithCandidate | null> {
  const best = candidates.toSorted((a, b) => b.exactSimilarity - a.exactSimilarity)[0];
  if (!best) return null;
  // Short claims must appear verbatim; longer ones may differ by about one word in five.
  return best.exactSimilarity === 1 || (best.claimWords >= 4 && best.exactSimilarity >= 0.8) ? best : null;
}

/**
 * Finds what the listed fatwa bodies have published on a fiqh claim, restricted to the sites in
 * content/sources.ts. Those sites have no public search API, so this is a grounded-search LLM call.
 * STUB(gemini): Gemini with Google Search grounding, then summarize each body's position citing the page.
 */
export async function findFatwaPositions(_claim: string): Promise<{ positions: Position[]; searched: string[] }> {
  throw new LlmUnavailableError("fatwa_search");
}

/**
 * Optional short explanation shown under a claim, written only from the retrieved evidence.
 * STUB(gemini): Gemini Flash, prompted to restate the cited ruling without adding any judgement.
 */
export async function explainClaim(_claim: { text: string; verdict: string; evidence: string }): Promise<string | undefined> {
  return undefined;
}
