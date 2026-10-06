import { extractFromMessage, ImageUnreadableError, verifyClaims } from "@/lib/pipeline/analyze";
import { checkRateLimit } from "@/lib/server/ratelimit";
import { signClaim } from "@/lib/server/signing";

const MAX_CHARS = 3000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const error = (status: number, code: string, headers?: HeadersInit) =>
  Response.json({ error: code }, { status, ...(headers ? { headers } : {}) });

/**
 * POST multipart/form-data { text?, image? } → NDJSON stream of events, one per line:
 *   {"type":"claim","claim":{…}} … {"type":"done","sourcesSearched":[…]}
 * Neither the text nor the image is stored or logged.
 */
export async function POST(request: Request) {
  const retryAfter = await checkRateLimit("analyze", request);
  if (retryAfter) return Response.json({ error: "rate_limited", retryAfter }, { status: 429, headers: { "Retry-After": String(retryAfter) } });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error(400, "invalid_request");
  }
  const text = form.get("text");
  const image = form.get("image");
  const input: { text?: string; image?: Blob } = {};
  if (typeof text === "string" && text.trim()) {
    if (text.length > MAX_CHARS) return error(413, "text_too_long");
    input.text = text.trim();
  }
  if (image instanceof Blob && image.size > 0) {
    if (!IMAGE_TYPES.includes(image.type) || image.size > MAX_IMAGE_BYTES) return error(415, "invalid_image");
    input.image = image;
  }
  if (!input.text && !input.image) return error(400, "empty");

  let extracted;
  try {
    extracted = await extractFromMessage(input);
  } catch (err) {
    if (err instanceof ImageUnreadableError) return error(422, "image_unreadable");
    console.error("analyze: extraction failed", err);
    return error(500, "analysis_failed");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        for await (const event of verifyClaims(extracted)) {
          send(event.type === "claim" ? { ...event, claim: event.claim.error ? event.claim : signClaim(event.claim) } : event);
        }
      } catch (err) {
        console.error("analyze: verification failed", err);
        send({ type: "error", error: "analysis_failed" });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
