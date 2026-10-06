import "server-only";
import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google";
import { generateText, Output, type ModelMessage } from "ai";
import { z } from "zod";
import type { ClaimType, Position } from "@/lib/types";
import { claimTypeSchema } from "@/lib/schemas";
import { FATWA_DOMAINS, FATWA_SITES, resolveSourceUrl, siteOf, type FatwaSite } from "./sources/fatwa";
import type { HadithCandidate } from "./sources/hadeethenc";

/**
 * Every LLM call in the pipeline goes through this module. Calls go to Gemini directly with a Google AI Studio key
 * (GOOGLE_GENERATIVE_AI_API_KEY), or through the Vercel AI Gateway when no key is set. Each call has a
 * deterministic fallback, so the pipeline keeps working, more conservatively, when the model is unreachable.
 *
 * The LLM never decides a verdict. It reads images, finds claims, suggests wordings to search with, judges whether
 * retrieved text is the same text as the claim, and summarizes fatwas it found on the listed sites (always linked to
 * the page). Verdicts come from source data in verify.ts.
 */

const MODEL_ID = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const MODEL = process.env.GOOGLE_GENERATIVE_AI_API_KEY ? google(MODEL_ID) : `google/${MODEL_ID}`;
const TIMEOUT_MS = 30_000;

export class LlmUnavailableError extends Error {
  constructor(task: string) {
    super(`llm_unavailable:${task}`);
    this.name = "LlmUnavailableError";
  }
}

type Input = { instructions: string } & ({ prompt: string } | { messages: ModelMessage[] });

async function generate<T>(task: string, schema: z.ZodType<T>, input: Input): Promise<T> {
  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema }),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      // Low thinking keeps a check to a few seconds; these tasks don't need deep reasoning. (3.8 Flash has no "minimal".)
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } satisfies GoogleLanguageModelOptions },
      ...input,
    });
    return output;
  } catch (err) {
    console.error(`llm: ${task} failed`, err);
    throw new LlmUnavailableError(task);
  }
}

// ---------------------------------------------------------------------------------------------------------
// Image reading

/** Transcribes the text in a screenshot of a forwarded message. Throws LlmUnavailableError when it cannot. */
export async function readImageText(image: Blob): Promise<string> {
  const { text } = await generate("ocr", z.object({ text: z.string() }), {
    instructions:
      "You transcribe screenshots of forwarded messages (WhatsApp, Telegram, social media). " +
      "Return the message text exactly as written, in its original language, keeping diacritics, brackets and line breaks. " +
      "Leave out app interface text such as timestamps, contact names, buttons and 'forwarded' labels. " +
      "Do not translate, correct or summarize. If there is no readable message text, return an empty string.",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Transcribe the message in this image." },
          { type: "file", mediaType: image.type, data: new Uint8Array(await image.arrayBuffer()) },
        ],
      },
    ],
  });
  return text.trim();
}

// ---------------------------------------------------------------------------------------------------------
// Claim extraction

export type ExtractedClaim = {
  /** Most likely type; used for the label when no lookup finds a match. */
  type: ClaimType;
  text: string;
  /** Every type the text could plausibly be, most likely first. Each one gets its own lookup. */
  types: ClaimType[];
  /** Canonical wordings the model recognises (e.g. the Quran or hadith text a misquote comes from), used only to search. */
  wordings: string[];
};

const extractionSchema = z.object({
  claims: z
    .array(
      z.object({
        text: z.string().describe("The claim copied verbatim from the message, without introductory phrases or references."),
        types: z.array(claimTypeSchema).min(1).max(3).describe("Every type this text could plausibly be, most likely first."),
        wordings: z
          .array(z.string())
          .max(4)
          .describe("Wordings of this text as they appear in the Quran or hadith collections, if you recognise it. Empty if unsure."),
      }),
    )
    .max(15),
});

const EXTRACTION_INSTRUCTIONS = `You split forwarded religious messages (mostly Arabic) into claims that can be checked against published Islamic sources.

Claim types:
- ayah: text presented as, or resembling, a verse of the Quran.
- hadith: words attributed to the Prophet ﷺ.
- dua: a supplication.
- attributed_saying: words attributed to a Companion, scholar or other named person.
- fiqh: a statement that something is obligatory, recommended, permitted, disliked or forbidden, including claims such as "sharing this message is obligatory".
- out_of_scope: any other religious claim that cannot be checked against Quran, hadith or fatwa sources.

Rules:
- Copy each claim's text verbatim from the message. Leave out introductory phrases (قال رسول الله ﷺ، قال تعالى، عن أبي هريرة رضي الله عنه) and references (رواه البخاري، متفق عليه).
- Decide claim boundaries from meaning, not punctuation or decorative characters. One claim per distinct statement.
- When a text could be more than one type, list all of them, most likely first. For example a supplication that is also a Quran verse ("ربنا آتنا في الدنيا حسنة") is ["dua", "ayah"]; a saying attributed to the Prophet ﷺ that is actually a verse is ["hadith", "ayah"].
- In wordings, give the text as it appears in the Quran or the hadith collections when you recognise it, including when the message misquotes it. Never invent a wording; leave it empty if unsure.
- Do not judge whether anything is authentic. Ignore greetings, chain-letter instructions with no religious claim, and the sender's commentary.
- If the message contains no checkable religious claim, return an empty list.`;

/** Splits a message into claims with their possible types. Falls back to marker-based heuristics when the LLM is unavailable. */
export async function extractClaims(message: string): Promise<ExtractedClaim[]> {
  try {
    const { claims } = await generate("extract", extractionSchema, { instructions: EXTRACTION_INSTRUCTIONS, prompt: message });
    return claims
      .map((c) => ({
        type: c.types[0]!,
        types: [...new Set(c.types)],
        text: c.text.trim(),
        wordings: c.wordings.map((w) => w.trim()).filter(Boolean),
      }))
      .filter((c) => c.text);
  } catch {
    return extractClaimsHeuristically(message);
  }
}

const AYAH_INTRO = /(?:قال|يقول)\s+(?:الله\s+)?(?:تعالى|عز وجل|سبحانه(?:\s+وتعالى)?)\s*[:：]?\s*/;
const HADITH_INTRO = /(?:قال|يقول|عن)\s+(?:رسول الله|النبي|الرسول)\s*(?:ﷺ|صلى الله عليه وسلم|عليه الصلاة والسلام)?\s*(?:قال|أنه قال)?\s*[:：]?\s*/;
const FIQH_HINT = /(?:حرام|حلال|يجوز|لا يجوز|بدعة|واجب|مكروه|مستحب|سنة مؤكدة|فرض)/;
const TRAILING_REF = /\s*[(\[]?\s*(?:رواه|أخرجه|متفق عليه)[^)\]\n]*[)\]]?\s*[.،]?\s*$/;

function clean(text: string): string {
  return text.replace(TRAILING_REF, "").replace(/^[\s"“”'.:،-]+|[\s"“”'.:،-]+$/g, "");
}

/** Fallback extractor: reads explicit markers (﴿…﴾, «…», قال تعالى, قال رسول الله, اللهم, حرام/يجوز…). */
function extractClaimsHeuristically(message: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const add = (types: ClaimType[], text: string) => {
    const t = clean(text);
    if (t.split(/\s+/).length >= 2 && !claims.some((c) => c.text === t)) claims.push({ type: types[0]!, types, text: t, wordings: [] });
  };

  let rest = message;
  for (const m of message.matchAll(/﴿([^﴾]+)﴾/g)) {
    add(["ayah"], m[1]!);
    rest = rest.replace(m[0], "\n");
  }
  for (const m of rest.matchAll(/«([^»]+)»/g)) {
    add(["hadith", "ayah"], m[1]!);
    rest = rest.replace(m[0], "\n");
  }
  for (const line of rest.split(/\n+|(?<=[.!؟])\s+/)) {
    const ayah = line.match(AYAH_INTRO);
    const hadith = line.match(HADITH_INTRO);
    if (ayah?.index !== undefined) add(["ayah"], line.slice(ayah.index + ayah[0].length));
    else if (hadith?.index !== undefined) add(["hadith", "ayah"], line.slice(hadith.index + hadith[0].length));
    else if (/^\s*اللهم/.test(line)) add(["dua"], line);
    else if (FIQH_HINT.test(line)) add(["fiqh"], line);
  }
  if (!claims.length && message.trim()) add(["hadith", "ayah"], message.slice(0, 600));
  return claims;
}

/** Wordings for a single claim, used when re-verifying one claim (no extraction output is available then). */
export async function suggestWordings(claim: string, type: ClaimType): Promise<string[]> {
  if (type === "fiqh" || type === "out_of_scope") return [];
  try {
    const { wordings } = await generate("wordings", z.object({ wordings: z.array(z.string()).max(4) }), {
      instructions:
        "Given a text from a forwarded message, return the wordings in which it appears in the Quran or the hadith collections, " +
        "if you recognise it, including when the message misquotes it. Never invent a wording; return an empty list if unsure.",
      prompt: `Type: ${type}\nText: ${claim}`,
    });
    return wordings.map((w) => w.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------------------------------------
// Hadith match judgement

const judgementSchema = z.object({
  matchId: z.string().nullable().describe("The id of the candidate that is the same hadith as the claim, or null."),
});

const JUDGE_INSTRUCTIONS = `You decide whether a text from a forwarded message is the same hadith as one of the candidate texts from a hadith encyclopedia.

It IS the same hadith when the claim carries the same statement, allowing for:
- spelling and diacritic differences, and wording differences between narrations of the same hadith;
- added or missing connecting words;
- the claim quoting only part of the candidate.

It is NOT the same hadith when:
- a key word is replaced by one with a different meaning (e.g. "النظافة من الإيمان" is not "البذاذة من الإيمان");
- the claim adds statements, promises or numbers that the candidate does not contain;
- they only share a topic or common phrases.

Return the id of the matching candidate, or null if none matches. When in doubt, return null.`;

/** Fallback: accept only a verbatim match, or a near word-for-word one of four words or more. */
function lexicalMatch(candidates: HadithCandidate[]): HadithCandidate | null {
  const best = candidates.toSorted((a, b) => b.exactSimilarity - a.exactSimilarity)[0];
  if (!best) return null;
  return best.exactSimilarity === 1 || (best.claimWords >= 4 && best.exactSimilarity >= 0.8) ? best : null;
}

/** Decides which retrieved entry, if any, is the same hadith as the claim. */
export async function pickHadithMatch(claim: string, candidates: HadithCandidate[]): Promise<HadithCandidate | null> {
  if (!candidates.length) return null;
  // A claim found verbatim inside a candidate needs no judgement.
  const verbatim = candidates.find((c) => c.exactSimilarity === 1 && c.claimWords >= 2);
  if (verbatim) return verbatim;
  try {
    const { matchId } = await generate("judge", judgementSchema, {
      instructions: JUDGE_INSTRUCTIONS,
      prompt: [`Claim: ${claim}`, "", ...candidates.map((c) => `Candidate ${c.id}: ${c.matn}`)].join("\n"),
    });
    return candidates.find((c) => c.id === matchId) ?? null;
  } catch {
    return lexicalMatch(candidates);
  }
}

// ---------------------------------------------------------------------------------------------------------
// Fatwa search

const SEARCH_INSTRUCTIONS = `You look up what established fatwa sites have published on a claim from a forwarded message.
Search only these sites, using site: operators: ${FATWA_DOMAINS.join(", ")}.
For each site that has a fatwa addressing the claim, write one short paragraph in Arabic starting with the site's domain in
square brackets, e.g. [islamqa.info], giving the page title and a neutral summary of the published position.
Report only what the pages say. Do not add your own opinion, and do not mention a site that has nothing on the claim.`;

const POSITIONS_INSTRUCTIONS = `You turn search findings about fatwa sites into structured positions.
For each site in the findings, return its domain, a neutral one or two sentence Arabic summary of its published position
(taken only from the findings, without adding anything), and the number of the source page that supports it.
The source must be a page on the same site. Skip any site without a supporting source page.`;

/**
 * Finds what the fatwa sites in sources/fatwa.ts have published on a fiqh claim. Those sites have no public search
 * API, so this is Gemini with Google Search grounding, in two calls: a grounded search (so every cited page is a real
 * search result), then structuring the findings. A position is kept only if its page is on that same site; the model
 * never supplies a link itself.
 */
/** Arabic slugs are percent-encoded; decoded they tell the model what each page is about. */
function readableUrl(url: string): string {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

export async function findFatwaPositions(claim: string): Promise<{ positions: Position[]; searched: string[] }> {
  const searched = FATWA_DOMAINS.map((d) => FATWA_SITES[d]);
  // Grounded search is a Gemini API tool, so it needs the direct Google key.
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new LlmUnavailableError("fatwa_search");

  let findings: string;
  let pages: { site: FatwaSite; url: string }[];
  try {
    const result = await generateText({
      model: google(MODEL_ID),
      tools: { google_search: google.tools.googleSearch({}) },
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      providerOptions: { google: { thinkingConfig: { thinkingLevel: "low" } } satisfies GoogleLanguageModelOptions },
      instructions: SEARCH_INSTRUCTIONS,
      prompt: `Claim: ${claim}`,
    });
    findings = result.text;
    const urls = await Promise.all(result.sources.map((s) => (s.sourceType === "url" ? resolveSourceUrl(s.url) : null)));
    pages = [...new Set(urls.filter((u): u is string => Boolean(u)))].map((url) => ({ site: siteOf(url)!, url }));
  } catch (err) {
    console.error("llm: fatwa_search failed", err);
    throw new LlmUnavailableError("fatwa_search");
  }
  if (!pages.length) return { positions: [], searched };

  const { positions } = await generate(
    "fatwa_positions",
    z.object({
      positions: z.array(z.object({ site: z.enum(FATWA_DOMAINS), summary: z.string(), source: z.number().int() })),
    }),
    {
      instructions: POSITIONS_INSTRUCTIONS,
      prompt: [`Claim: ${claim}`, "", "Findings:", findings, "", "Source pages:", ...pages.map((p, i) => `${i + 1}. ${readableUrl(p.url)}`)].join("\n"),
    },
  );

  const seen = new Set<FatwaSite>();
  return {
    searched,
    positions: positions.flatMap((p) => {
      const page = pages[p.source - 1];
      if (!page || page.site !== p.site || seen.has(p.site) || !p.summary.trim()) return [];
      seen.add(p.site);
      return [{ body: FATWA_SITES[p.site], summary: p.summary.trim(), url: page.url }];
    }),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Explanations (not wired to a model yet)

/**
 * Optional short explanation shown under a claim, written only from the retrieved evidence.
 * STUB(gemini): restate the cited ruling without adding any judgement.
 */
export async function explainClaim(_claim: { text: string; verdict: string; evidence: string }): Promise<string | undefined> {
  return undefined;
}
