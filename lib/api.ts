import type { Claim, ShareCard } from "./types";
import { CardExpiredError, ImageReadError, RateLimitError } from "./errors";
import { DEMO_CARD_IDS, DEMO_TAG, demoAnalyze, demoGetCard, demosEnabled } from "./demo-api";

export { CardExpiredError, ImageReadError, RateLimitError };

async function throwForStatus(res: Response): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number };
  if (res.status === 429) throw new RateLimitError(body.retryAfter ?? Number(res.headers.get("Retry-After") ?? 30));
  if (body.error === "image_unreadable") throw new ImageReadError();
  throw new Error(body.error ?? `http_${res.status}`);
}

/** Streams claims from /api/analyze as the server verifies them. */
export async function analyze(
  input: { text?: string; image?: File },
  onClaim: (claim: Claim) => void,
  onDone: (sourcesSearched: string[]) => void,
): Promise<void> {
  if (demosEnabled && input.text && DEMO_TAG.test(input.text)) return demoAnalyze(input.text, onClaim, onDone);

  const form = new FormData();
  if (input.text) form.set("text", input.text);
  if (input.image) form.set("image", input.image);
  const res = await fetch("/api/analyze", { method: "POST", body: form });
  if (!res.ok || !res.body) return throwForStatus(res);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let finished = false;
  for (;;) {
    const { value, done } = await reader.read();
    buffer += value ?? "";
    const lines = buffer.split("\n");
    buffer = done ? "" : lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as
        | { type: "claim"; claim: Claim }
        | { type: "done"; sourcesSearched: string[] }
        | { type: "error"; error: string };
      if (event.type === "claim") onClaim(event.claim);
      else if (event.type === "done") {
        finished = true;
        onDone(event.sourcesSearched);
      } else throw new Error(event.error);
    }
    if (done) break;
  }
  if (!finished) throw new Error("stream_interrupted");
}

/** Re-verifies one claim that failed during analysis. */
export async function retryClaim(claim: Claim): Promise<Claim> {
  const res = await fetch("/api/claims/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: claim.id, type: claim.type, text: claim.text }),
  });
  if (!res.ok) return throwForStatus(res);
  return ((await res.json()) as { claim: Claim }).claim;
}

/** Stores verified claims as a share card. The original message and image are never sent. */
export async function createCard(claims: Claim[], sourcesSearched: string[]): Promise<{ id: string }> {
  const res = await fetch("/api/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claims, sourcesSearched }),
  });
  if (!res.ok) return throwForStatus(res);
  return (await res.json()) as { id: string };
}

/** null when the card does not exist or has expired. */
export async function getCard(id: string): Promise<ShareCard | null> {
  if (demosEnabled && DEMO_CARD_IDS.includes(id)) return demoGetCard(id);
  const res = await fetch(`/api/cards/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) return throwForStatus(res);
  return (await res.json()) as ShareCard;
}
