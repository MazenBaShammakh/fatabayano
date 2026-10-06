import type { Verdict } from "@/lib/types";

export type AboutContent = {
  title: string;
  intro: string;
  steps: { heading: string; items: string[] };
  verdicts: { heading: string; items: { verdict: Verdict; meaning: string }[] };
  notDo: { heading: string; items: string[] };
  ai: { heading: string; paragraphs: string[] };
};

export type SourceItem = { name: string; description: string; url: string };
export type SourcesContent = {
  title: string;
  intro: string;
  groups: { heading: string; items: SourceItem[] }[];
  note: string;
};

export type PrivacyContent = {
  title: string;
  intro: string;
  sections: { heading: string; items: string[] }[];
};
