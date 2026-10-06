import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Claim } from "@/lib/types";

/**
 * Share cards are built from claims the browser sends back. Signing each claim the pipeline
 * produces lets the card endpoint reject edited or invented verdicts.
 */

let devSecret: string | undefined;

function secret(): string {
  const s = process.env.RESULT_SIGNING_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("RESULT_SIGNING_SECRET is not set");
  devSecret ??= randomBytes(32).toString("hex");
  return devSecret;
}

/** JSON with sorted keys, so the signature does not depend on property order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(claim: Claim): Buffer {
  const { sig: _sig, id: _id, ...content } = claim;
  return createHmac("sha256", secret()).update(canonical(content)).digest();
}

export function signClaim(claim: Claim): Claim {
  return { ...claim, sig: digest(claim).toString("base64url") };
}

export function isSignedClaim(claim: Claim): boolean {
  if (!claim.sig) return false;
  const given = Buffer.from(claim.sig, "base64url");
  const expected = digest(claim);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
