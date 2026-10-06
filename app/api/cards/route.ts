import type { ShareCard } from "@/lib/types";
import { createCardSchema } from "@/lib/schemas";
import { saveCard, StorageUnavailableError } from "@/lib/server/cards";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { isSignedClaim } from "@/lib/server/signing";

/** POST { claims, sourcesSearched } → { id }. Only claims signed by /api/analyze can be shared. */
export async function POST(request: Request) {
  const retryAfter = await checkRateLimit("cards", request);
  if (retryAfter) return Response.json({ error: "rate_limited", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

  const parsed = createCardSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const { claims, sourcesSearched } = parsed.data;
  if (!claims.every((c) => !c.error && isSignedClaim(c))) return Response.json({ error: "unverified_claims" }, { status: 400 });

  const card: ShareCard = {
    v: 1,
    createdAt: new Date().toISOString(),
    claims: claims.map(({ sig: _sig, ...c }) => c),
    sourcesSearched,
  };
  try {
    return Response.json({ id: await saveCard(card) }, { status: 201 });
  } catch (err) {
    if (err instanceof StorageUnavailableError) return Response.json({ error: "storage_unavailable" }, { status: 503 });
    throw err;
  }
}
