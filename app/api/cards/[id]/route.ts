import { loadCard, StorageUnavailableError } from "@/lib/server/cards";

/** GET → the stored card, or 404 when it never existed or has expired. */
export async function GET(_request: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const { id } = await ctx.params;
  try {
    const card = await loadCard(id);
    return card ? Response.json(card) : Response.json({ error: "not_found" }, { status: 404 });
  } catch (err) {
    if (err instanceof StorageUnavailableError) return Response.json({ error: "storage_unavailable" }, { status: 503 });
    throw err;
  }
}
