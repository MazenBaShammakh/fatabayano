import "server-only";

/** Fatwa sites searched for fiqh claims, by domain. Positions are only ever shown from these. */
export const FATWA_SITES = {
  "islamqa.info": "الإسلام سؤال وجواب",
  "islamweb.net": "إسلام ويب، مركز الفتوى",
  "binbaz.org.sa": "موقع الشيخ عبدالعزيز بن باز",
  "binothaimeen.net": "موقع الشيخ محمد بن صالح العثيمين",
} as const;

export type FatwaSite = keyof typeof FATWA_SITES;

export const FATWA_DOMAINS = Object.keys(FATWA_SITES) as FatwaSite[];

export function siteOf(url: string): FatwaSite | null {
  try {
    const host = new URL(url).hostname;
    return FATWA_DOMAINS.find((d) => host === d || host.endsWith(`.${d}`)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Search grounding cites pages through short-lived Google redirect links. Resolve them to the page itself so the
 * card links to the fatwa and we can check which site it is on.
 */
export async function resolveSourceUrl(url: string): Promise<string | null> {
  if (siteOf(url)) return url;
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(5000) });
    const location = res.headers.get("location");
    return location && siteOf(location) ? location : null;
  } catch {
    return null;
  }
}
