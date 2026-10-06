// Downloads every Arabic hadith from the HadeethEnc API into data/hadeethenc.json.
// HadeethEnc has no text search, so we keep a local copy and match against it.
// Run: node scripts/import-hadeethenc.mjs
import { readFile, rm, writeFile } from "node:fs/promises";

const API = "https://hadeethenc.com/api/v1";
const CONCURRENCY = 4;
const OUT = new URL("../data/hadeethenc.json", import.meta.url);
// Progress is checkpointed here so an interrupted import resumes instead of starting over.
const PARTIAL = new URL("../data/hadeethenc.partial.json", import.meta.url);

async function get(path, attempt = 1) {
  let retryable;
  try {
    const res = await fetch(`${API}${path}`);
    if (res.ok) return await res.json();
    retryable = res.status === 429 || res.status >= 500;
    if (!retryable) throw new Error(`${path}: HTTP ${res.status}`);
  } catch (err) {
    if (retryable === false || attempt >= 6) throw err;
  }
  await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  return get(path, attempt + 1);
}

const categories = await get("/categories/roots/?language=ar");
const ids = new Set();
for (const c of categories) {
  for (let page = 1, last = 1; page <= last; page++) {
    const res = await get(`/hadeeths/list/?language=ar&category_id=${c.id}&page=${page}&per_page=100`);
    last = Number(res.meta.last_page);
    for (const h of res.data) ids.add(h.id);
  }
  console.log(`category ${c.id} (${c.title}): ${ids.size} ids so far`);
}

const hadiths = await readFile(PARTIAL, "utf8").then(JSON.parse, () => []);
const have = new Set(hadiths.map((h) => h.id));
const queue = [...ids].filter((id) => !have.has(id));
console.log(`${hadiths.length} already downloaded, ${queue.length} to go`);
let done = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const h = await get(`/hadeeths/one/?language=ar&id=${id}`);
      hadiths.push({
        id: h.id,
        title: h.title,
        hadeeth: h.hadeeth,
        attribution: h.attribution,
        grade: h.grade,
      });
      if (++done % 200 === 0) {
        console.log(`${done}/${queue.length + done}`);
        await writeFile(PARTIAL, JSON.stringify(hadiths));
      }
    }
  }),
);

hadiths.sort((a, b) => Number(a.id) - Number(b.id));
const data = { source: "https://hadeethenc.com", importedAt: new Date().toISOString(), hadiths };
await writeFile(OUT, JSON.stringify(data));
await rm(PARTIAL, { force: true });
console.log(`wrote ${hadiths.length} hadiths`);
