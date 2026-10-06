// Downloads the Quran text from the quran.com API into data/quran.json.
// Run: node scripts/import-quran.mjs
import { writeFile } from "node:fs/promises";

const API = "https://api.quran.com/api/v4";

async function get(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const [{ chapters }, { verses: uthmani }, { verses: imlaei }] = await Promise.all([
  get("/chapters?language=ar"),
  get("/quran/verses/uthmani"),
  get("/quran/verses/imlaei"),
]);

if (uthmani.length !== 6236 || imlaei.length !== 6236) throw new Error("unexpected verse count");

const verses = uthmani.map((v, i) => {
  const [surah, ayah] = v.verse_key.split(":").map(Number);
  if (imlaei[i].verse_key !== v.verse_key) throw new Error(`verse order mismatch at ${v.verse_key}`);
  // [surah, ayah, imlaei (for matching), uthmani (for display)]
  return [surah, ayah, imlaei[i].text_imlaei, v.text_uthmani];
});

const data = {
  source: "https://quran.com",
  importedAt: new Date().toISOString(),
  surahs: chapters.map((c) => c.name_arabic),
  verses,
};

await writeFile(new URL("../data/quran.json", import.meta.url), JSON.stringify(data));
console.log(`wrote ${verses.length} verses, ${data.surahs.length} surahs`);
