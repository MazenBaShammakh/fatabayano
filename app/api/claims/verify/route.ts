import { verifyClaim } from "@/lib/pipeline/verify";
import { retryClaimSchema } from "@/lib/schemas";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { signClaim } from "@/lib/server/signing";

/** POST { id, type, text } → { claim }. Re-verifies a single claim that failed during analysis. */
export async function POST(request: Request) {
  const retryAfter = await checkRateLimit("analyze", request);
  if (retryAfter) return Response.json({ error: "rate_limited", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

  const parsed = retryClaimSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const { claim } = await verifyClaim({ type: parsed.data.type, text: parsed.data.text }, parsed.data.id);
  return Response.json({ claim: claim.error ? claim : signClaim(claim) });
}
