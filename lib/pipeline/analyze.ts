import "server-only";
import type { Claim } from "@/lib/types";
import { extractClaims, LlmUnavailableError, readImageText, type ExtractedClaim } from "./llm";
import { verifyClaim } from "./verify";

export class ImageUnreadableError extends Error {
  constructor() {
    super("image_unreadable");
    this.name = "ImageUnreadableError";
  }
}

export type AnalyzeEvent = { type: "claim"; claim: Claim } | { type: "done"; sourcesSearched: string[] };

/** Step 1: read the message (OCR for images) and split it into claims. Runs before any response is streamed. */
export async function extractFromMessage(input: { text?: string; image?: Blob }): Promise<ExtractedClaim[]> {
  const parts = [input.text ?? ""];
  if (input.image) {
    try {
      parts.push(await readImageText(input.image));
    } catch (err) {
      if (err instanceof LlmUnavailableError) throw new ImageUnreadableError();
      throw err;
    }
    if (!parts.at(-1)?.trim() && !input.text?.trim()) throw new ImageUnreadableError();
  }
  return extractClaims(parts.filter(Boolean).join("\n\n"));
}

/**
 * Step 2: verify claims in parallel and emit each as soon as it is done, so the UI fills in progressively.
 * The message itself is never stored.
 */
export async function* verifyClaims(extracted: ExtractedClaim[]): AsyncGenerator<AnalyzeEvent> {
  const searched = new Set<string>();
  const pending = new Map(extracted.map((c, i) => [i, verifyClaim(c, `c${i + 1}`).then((r) => ({ i, ...r }))] as const));
  while (pending.size) {
    const { i, claim, searched: s } = await Promise.race(pending.values());
    pending.delete(i);
    s.forEach((name) => searched.add(name));
    yield { type: "claim", claim };
  }
  yield { type: "done", sourcesSearched: [...searched] };
}
