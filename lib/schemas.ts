import { z } from "zod";

/** Validates claims sent back by the browser (share cards, per-claim retry), so stored data keeps the expected shape. */

const short = z.string().max(2000);

export const claimTypeSchema = z.enum(["ayah", "hadith", "dua", "attributed_saying", "fiqh", "out_of_scope"]);

export const claimSchema = z.object({
  id: z.string().max(64),
  type: claimTypeSchema,
  text: short,
  verdict: z.enum([
    "ayah_exact",
    "ayah_misquoted",
    "ayah_not_found",
    "authentic",
    "weak",
    "fabricated",
    "not_hadith",
    "not_found",
    "positions_found",
    "none_found",
    "out_of_scope",
  ]),
  reference: short.optional(),
  correctedText: short.optional(),
  sources: z.array(z.object({ name: short, url: z.url(), scholar: short.optional(), ruling: short.optional() })).max(20),
  positions: z.array(z.object({ body: short, summary: short, url: z.url() })).max(20).optional(),
  abstained: z.boolean(),
  referral: short.optional(),
  generatedExplanation: short.optional(),
  error: z.boolean().optional(),
  sig: z.string().max(100).optional(),
});

export const createCardSchema = z.object({
  claims: z.array(claimSchema).min(1).max(30),
  sourcesSearched: z.array(z.string().max(200)).max(30),
});

export const retryClaimSchema = z.object({ id: z.string().max(64), type: claimTypeSchema, text: z.string().min(1).max(3000) });
