export type ClaimType = "ayah" | "hadith" | "dua" | "attributed_saying" | "fiqh" | "out_of_scope";

export type Verdict =
  | "ayah_exact"
  | "ayah_misquoted"
  | "ayah_not_found"
  | "authentic"
  | "weak"
  | "fabricated"
  | "not_hadith"
  | "not_found"
  | "positions_found"
  | "none_found"
  | "out_of_scope";

export type Source = { name: string; url: string; scholar?: string; ruling?: string };

/** A published fatwa position from a named body. */
export type Position = { body: string; summary: string; url: string };

export type Claim = {
  id: string;
  type: ClaimType;
  text: string;
  verdict: Verdict;
  /** For ayahs, e.g. 'الحجرات ٤٩:٦' */
  reference?: string;
  /** For misquoted ayahs */
  correctedText?: string;
  sources: Source[];
  positions?: Position[];
  abstained: boolean;
  referral?: string;
  generatedExplanation?: string;
  error?: boolean;
  /** Server signature over the claim's content; required to put the claim on a share card. */
  sig?: string;
};

export type AnalysisResult = { claims: Claim[]; sourcesSearched: string[] };

/** Never contains the original message or the image. */
export type ShareCard = { v: 1; createdAt: string; claims: Claim[]; sourcesSearched: string[] };
