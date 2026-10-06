import type { AnalysisResult, Claim } from "@/lib/types";

const DORAR = "https://dorar.net";

// DEMO DATA, not real rulings
export const ayahExact: Claim = {
  id: "demo-ayah-exact",
  type: "ayah",
  text: "يَا أَيُّهَا الَّذِينَ آمَنُوا إِن جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا",
  verdict: "ayah_exact",
  reference: "الحجرات ٤٩:٦",
  sources: [{ name: "المصحف الشريف", url: "https://quran.com/49/6" }],
  abstained: false,
};

// DEMO DATA, not real rulings
export const ayahMisquoted: Claim = {
  id: "demo-ayah-misquoted",
  type: "ayah",
  text: "[نص آية بخطأ تجريبي]",
  verdict: "ayah_misquoted",
  reference: "[سورة تجريبية ١:١]",
  correctedText: "[النص الصحيح التجريبي]",
  sources: [{ name: "[مصدر تجريبي]", url: "https://quran.com" }],
  abstained: false,
};

// DEMO DATA, not real rulings
export const ayahNotFound: Claim = {
  id: "demo-ayah-not-found",
  type: "ayah",
  text: "[نص تجريبي]",
  verdict: "ayah_not_found",
  sources: [],
  abstained: true,
  referral: "اسأل مختصًا",
};

// DEMO DATA, not real rulings
export const authentic: Claim = {
  id: "demo-authentic",
  type: "hadith",
  text: "إنما الأعمال بالنيات",
  verdict: "authentic",
  sources: [
    { name: "صحيح البخاري", ruling: "متفق عليه", url: "https://sunnah.com/bukhari:1" },
    { name: "الدرر السنية", url: DORAR },
  ],
  abstained: false,
};

// DEMO DATA, not real rulings
export const weak: Claim = {
  id: "demo-weak",
  type: "hadith",
  text: "اطلبوا العلم ولو في الصين",
  verdict: "weak",
  sources: [{ name: "الدرر السنية", ruling: "ضعيف", url: DORAR }],
  abstained: false,
  generatedExplanation: "[شرح تجريبي مُولَّد]",
};

// DEMO DATA, not real rulings
export const fabricated: Claim = {
  id: "demo-fabricated",
  type: "hadith",
  text: "[نص تجريبي]",
  verdict: "fabricated",
  sources: [{ name: "[مصدر تجريبي]", ruling: "[حكم تجريبي]", url: DORAR }],
  abstained: false,
};

// DEMO DATA, not real rulings
export const notHadith: Claim = {
  id: "demo-not-hadith",
  type: "attributed_saying",
  text: "[نص تجريبي]",
  verdict: "not_hadith",
  sources: [{ name: "[مصدر تجريبي]", url: DORAR }],
  abstained: false,
};

// DEMO DATA, not real rulings
export const notFound: Claim = {
  id: "demo-not-found",
  type: "hadith",
  text: "[نص تجريبي]",
  verdict: "not_found",
  sources: [],
  abstained: true,
  referral: "اسأل مختصًا",
};

// DEMO DATA, not real rulings
export const positionsFound: Claim = {
  id: "demo-positions-found",
  type: "fiqh",
  text: "[ادعاء فقهي تجريبي]",
  verdict: "positions_found",
  sources: [],
  positions: [
    { body: "الموسوعة الفقهية الكويتية", summary: "[ملخص موقف تجريبي أول]", url: "https://example.com/demo-1" },
    { body: "الإسلام سؤال وجواب", summary: "[ملخص موقف تجريبي ثانٍ]", url: "https://islamqa.info" },
  ],
  abstained: false,
};

// DEMO DATA, not real rulings
export const noneFound: Claim = {
  id: "demo-none-found",
  type: "fiqh",
  text: "[نص تجريبي]",
  verdict: "none_found",
  sources: [],
  abstained: true,
  referral: "اسأل مختصًا",
};

// DEMO DATA, not real rulings
export const outOfScope: Claim = {
  id: "demo-out-of-scope",
  type: "out_of_scope",
  text: "[نص تجريبي]",
  verdict: "out_of_scope",
  sources: [],
  abstained: false,
};

// DEMO DATA, not real rulings
export const allDemoClaims: Claim[] = [
  ayahExact,
  ayahMisquoted,
  ayahNotFound,
  authentic,
  weak,
  fabricated,
  notHadith,
  notFound,
  positionsFound,
  noneFound,
  outOfScope,
];

// DEMO DATA, not real rulings
export const demoSourcesSearched = ["المصحف الشريف", "صحيح البخاري", "الدرر السنية", "الموسوعة الفقهية الكويتية", "الإسلام سؤال وجواب"];

// DEMO DATA, not real rulings
export function sampleResult(): AnalysisResult {
  return { claims: [weak, ayahExact, notFound, authentic], sourcesSearched: demoSourcesSearched };
}
