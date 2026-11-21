// Builds data/libraries.json: every live OverDrive/Libby library as [code, name], sorted by name.
// Run by .github/workflows/libraries.yml (weekly, or by hand from the Actions tab). Needs Node 18+.
// One polite pass through the public library list; nothing else is fetched.
import { writeFile } from 'node:fs/promises';

const BASE = 'https://thunder.api.overdrive.com/v2/libraries';
const PER_PAGE = 100, PAUSE_MS = 300, MAX_PAGES = 3000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage(page) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${BASE}?perPage=${PER_PAGE}&page=${page}`, { headers: { 'User-Agent': 'Storytime library list (github.com/isaymotion/Storytime)', Accept: 'application/json' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      if (attempt >= 4) throw err;
      await sleep(2000 * attempt);
    }
  }
}

const seen = new Map();
let total = Infinity;
for (let page = 1; page <= MAX_PAGES; page++) {
  const data = await getPage(page);
  const items = Array.isArray(data.items) ? data.items : [];
  if (typeof data.totalItems === 'number') total = data.totalItems;
  for (const it of items) {
    const key = String(it.preferredKey || it.id || '').toLowerCase();
    const name = String(it.name || '').replace(/\s+/g, ' ').trim();
    if (!/^[a-z0-9-]+$/.test(key) || !name) continue;
    if (it.status && it.status !== 'Live') continue;
    if (!seen.has(key)) seen.set(key, name.slice(0, 120));
  }
  if (page % 20 === 0) console.log(`page ${page}: ${seen.size} libraries so far`);
  if (!items.length || page * PER_PAGE >= total || !(data.links && data.links.next)) break;
  await sleep(PAUSE_MS);
}
if (seen.size < 1000) throw new Error(`Only ${seen.size} libraries found; refusing to overwrite the list.`);
const list = [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'en', { sensitivity: 'base' }));
await writeFile(new URL('../data/libraries.json', import.meta.url), JSON.stringify({ built: new Date().toISOString().slice(0, 10), libraries: list }));
console.log(`Wrote ${list.length} libraries.`);
