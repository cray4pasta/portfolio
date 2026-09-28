#!/usr/bin/env node
/* Fetches coin photos from the Numista catalogue for the About page.

   Reads assets/coins/coins.json, finds each coin on Numista (by its
   `query` + `year`, or directly by `numistaId`), downloads the obverse and
   reverse photos into assets/coins/, and writes the resolved Numista ID,
   title, image paths and photo credits back into coins.json.

   The site itself never calls Numista, so the API key stays on this
   machine: put it in a .env file at the repo root (it's gitignored):

     NUMISTA_API_KEY=your-key-here

   Usage:
     node scripts/fetch-coins.mjs           fetch coins that don't have photos yet
     node scripts/fetch-coins.mjs --force   re-fetch every coin
     node scripts/fetch-coins.mjs --search "10 baht" --year 2021
                                            list matches to pick a numistaId from */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COINS_DIR = path.join(ROOT, 'assets/coins');
const DATA_FILE = path.join(COINS_DIR, 'coins.json');
const API = 'https://api.numista.com/v3';

async function loadKey() {
  if (process.env.NUMISTA_API_KEY) return process.env.NUMISTA_API_KEY;
  const envFile = path.join(ROOT, '.env');
  if (existsSync(envFile)) {
    const match = (await readFile(envFile, 'utf8')).match(/^NUMISTA_API_KEY\s*=\s*"?([^"\n]+)"?/m);
    if (match) return match[1].trim();
  }
  console.error('Missing NUMISTA_API_KEY. Add it to .env at the repo root:\n\n  NUMISTA_API_KEY=your-key-here\n');
  process.exit(1);
}

const KEY = await loadKey();

async function api(pathname, params = {}) {
  const url = new URL(API + pathname);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { 'Numista-API-Key': KEY } });
  if (res.status === 401) throw new Error('Numista rejected the API key (401). Check NUMISTA_API_KEY in .env.');
  if (res.status === 429) throw new Error('Numista rate limit or monthly quota reached (429). Try again later.');
  if (!res.ok) throw new Error(`Numista ${res.status} for ${url.pathname}${url.search}`);
  return res.json();
}

// `date` is the Gregorian issue year (`year` would have to match what's
// printed on the coin, e.g. Japan's era years).
// category=coin (deprecated, but still honored) keeps banknotes and
// tokens out of the results.
const search = (q, year, count = 10) =>
  api('/types', { q, date: year, category: 'coin', order: 'relevance', count });

async function download(url, file) {
  const res = await fetch(url, { headers: { 'User-Agent': 'prernakashyap.com coin poster' } });
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.startsWith('image/')) {
    throw new Error(`Couldn't download ${url} (${res.status} ${type})`);
  }
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
const extOf = (url) => (path.extname(new URL(url).pathname) || '.jpg').toLowerCase();

// Edge color from the coin's alloy, so a copper-nickel coin doesn't get a
// gold edge. Gold is the fallback (and the component's default).
function metalColor(composition = '') {
  const c = composition.toLowerCase();
  if (/nordic gold|brass|aluminium[- ]bronze|aluminum[- ]bronze/.test(c) && !/plated/.test(c)) return null; // gold-colored alloys
  if (/(copper|bronze)[- ]plated/.test(c)) return '#c07a4f'; // plating is what you see
  if (/(nickel|brass)[- ]plated/.test(c)) return /brass/.test(c) ? null : '#c8cbcf';
  if (/alumin/.test(c)) return '#d9dbde';
  if (/nickel|steel|silver|zinc|cupronickel/.test(c) && !/brass|bronze|aluminium-bronze/.test(c)) return '#c8cbcf';
  if (/copper/.test(c) && !/brass|bronze|nickel/.test(c)) return '#c07a4f';
  if (/bronze/.test(c) && !/alumin/.test(c)) return '#b8864b';
  return null;
}

function credit(side) {
  if (!side?.picture_copyright) return null;
  return {
    by: side.picture_copyright,
    url: side.picture_copyright_url || null,
    license: side.picture_license_name || null,
  };
}

/* ─── --search mode: print candidates so you can pin a numistaId ─── */

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args.includes('--search')) {
  const { count, types } = await search(flag('--search'), flag('--year'), 20);
  console.log(`${count} match(es)${count > types.length ? `, showing ${types.length}` : ''}:\n`);
  for (const t of types) {
    const years = t.min_year === t.max_year ? t.min_year : `${t.min_year}–${t.max_year}`;
    console.log(`  ${String(t.id).padEnd(8)} ${t.issuer?.name ?? ''} · ${t.title} (${years})`);
  }
  process.exit(0);
}

/* ─── Fetch mode ─── */

const force = args.includes('--force');
const coins = JSON.parse(await readFile(DATA_FILE, 'utf8'));
await mkdir(COINS_DIR, { recursive: true });

let failed = 0;
for (const coin of coins) {
  const label = `${coin.place ?? `N# ${coin.numistaId}`} ${coin.year ?? ''}`.trim();
  if (!force && coin.front && coin.back && existsSync(path.join(ROOT, coin.front))) {
    // (entries only need a numistaId; place and edge color come from Numista)
    console.log(`✓ ${label}: already has photos`);
    continue;
  }
  try {
    let id = coin.numistaId;
    if (!id) {
      if (!coin.query) throw new Error('needs a "query" (e.g. "100 yen") or a "numistaId"');
      const { types } = await search(coin.query, coin.year);
      if (!types.length) throw new Error(`no Numista match for "${coin.query}" in ${coin.year}`);
      // Prefer a coin actually issued by the place (e.g. "2 euro" also
      // matches every eurozone country).
      const place = coin.place.toLowerCase();
      const pick = types.find((t) => t.issuer?.name?.toLowerCase() === place) ?? types[0];
      id = pick.id;
      if (types.length > 1) {
        console.log(`  ${label}: ${types.length} matches, using the top one. To pick another, run:`);
        console.log(`    node scripts/fetch-coins.mjs --search "${coin.query}" --year ${coin.year}`);
      }
    }

    const type = await api(`/types/${id}`);
    if (!type.obverse?.picture || !type.reverse?.picture) {
      throw new Error(`Numista type ${id} has no obverse/reverse photo; pin a different numistaId`);
    }

    coin.place ??= type.issuer?.name ?? `Coin ${id}`;
    coin.metal ??= metalColor(type.composition?.text) ?? undefined;
    const slug = slugify(`${coin.place}-${id}`);
    const front = `assets/coins/${slug}-front${extOf(type.obverse.picture)}`;
    const back = `assets/coins/${slug}-back${extOf(type.reverse.picture)}`;
    await download(type.obverse.picture, path.join(ROOT, front));
    await download(type.reverse.picture, path.join(ROOT, back));

    Object.assign(coin, {
      numistaId: id,
      title: type.title,
      numistaUrl: type.url,
      front,
      back,
      // Non-round coins get their 3D outline traced from the photo.
      ...(type.shape && !/^round/i.test(type.shape) ? { shape: type.shape } : {}),
      credits: [credit(type.obverse), credit(type.reverse)].filter(Boolean),
    });
    console.log(`✓ ${label}: ${type.title} (N# ${id})`);
  } catch (err) {
    failed++;
    console.error(`✗ ${label}: ${err.message}`);
  }
}

await writeFile(DATA_FILE, JSON.stringify(coins, null, 2) + '\n');
console.log(`\nUpdated ${path.relative(ROOT, DATA_FILE)}${failed ? ` (${failed} failed)` : ''}.`);
if (failed) process.exitCode = 1;
