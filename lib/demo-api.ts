import type { Claim, ShareCard } from "./types";
import { allDemoClaims, sampleResult } from "@/mocks/claims";
import { CardExpiredError, ImageReadError, RateLimitError } from "./errors";

/**
 * Development-only mock used by /dev/states to preview UI states. Never used in production:
 * it returns DEMO DATA, not real rulings.
 */

export const DEMO_TAG = /\[(limit|unreadable|fail|empty|partial|all)\]/;
export const DEMO_CARD_IDS = ["demo", "expired"];
export const demosEnabled = process.env.NODE_ENV !== "production";

const delay = (min = 300, max = 900) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

export async function demoAnalyze(
  text: string,
  onClaim: (claim: Claim) => void,
  onDone: (sourcesSearched: string[]) => void,
): Promise<void> {
  await delay();
  if (text.includes("[limit]")) throw new RateLimitError(30);
  if (text.includes("[unreadable]")) throw new ImageReadError();
  if (text.includes("[fail]")) throw new Error("analysis_failed");

  const sample = sampleResult();
  if (text.includes("[empty]")) {
    onDone(sample.sourcesSearched);
    return;
  }
  const claims = text.includes("[all]") ? allDemoClaims : sample.claims;
  const partial = text.includes("[partial]"); // second claim fails
  for (const [i, claim] of claims.entries()) {
    await delay(400, 1100);
    onClaim(partial && i === 1 ? { ...claim, error: true } : claim);
  }
  onDone(sample.sourcesSearched);
}

export async function demoGetCard(id: string): Promise<ShareCard> {
  await delay(200, 500);
  if (id === "expired") throw new CardExpiredError();
  const s = sampleResult();
  return { v: 1, createdAt: new Date().toISOString(), claims: s.claims, sourcesSearched: s.sourcesSearched };
}
