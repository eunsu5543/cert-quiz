// NHN Cloud user guide crawler.
// Politely fetches docs.nhncloud.com pages reachable from the start URL,
// converts the main content to Markdown, and saves under data/source/guide/.
// Resumable: already-saved files are skipped.

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const START_URLS = [
  'https://docs.nhncloud.com/ko/nhncloud/ko/overview/',
];
const BASE_HOST = 'docs.nhncloud.com';
const OUTPUT_DIR = 'data/source/guide';
const MAX_DEPTH = 2;
const RATE_MS = 1000;
const USER_AGENT = 'cert-quiz-content-bot/0.1 (https://github.com/eunsu5543/cert-quiz; respectful crawl, 1 req/sec)';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});

const visited = new Set();
const failed = [];

function urlToPath(rawUrl) {
  const u = new URL(rawUrl);
  const segments = u.pathname.split('/').filter(Boolean);
  // Dedup consecutive "ko" segments common in docs.nhncloud.com URL shape
  const cleaned = [];
  for (const s of segments) {
    if (s === 'ko' && cleaned[cleaned.length - 1] === 'ko') continue;
    cleaned.push(s);
  }
  const last = cleaned.pop() || 'index';
  const filename = last.endsWith('.md') ? last : `${last}.md`;
  return path.join(OUTPUT_DIR, ...cleaned, filename);
}

async function fetchAndSave(url, depth) {
  if (visited.has(url) || depth > MAX_DEPTH) return [];
  visited.add(url);

  const filePath = urlToPath(url);
  // Resume: skip if already saved
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ cached  ${url}`);
    // Still parse from cache to walk links? Easier: skip outgoing too. Caller will re-traverse next run if needed.
    return [];
  }

  console.log(`[d=${depth}] ${url}`);
  let html;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) {
      console.warn(`  ✗ ${res.status} ${url}`);
      failed.push({ url, status: res.status });
      return [];
    }
    html = await res.text();
  } catch (e) {
    console.warn(`  ✗ ${e.message} ${url}`);
    failed.push({ url, error: e.message });
    return [];
  }

  const $ = cheerio.load(html);
  // Best-effort main content selectors (try a few in order)
  const candidates = ['main', 'article', '.content', '.doc-body', '#content', '.document-content'];
  let main = $();
  for (const sel of candidates) {
    main = $(sel).first();
    if (main.length && main.text().trim().length > 50) break;
  }
  const contentHtml = main.length ? main.html() : $('body').html() || '';
  const md = turndown.turndown(contentHtml);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const header = `<!-- Source: ${url} -->\n<!-- Fetched: ${new Date().toISOString()} -->\n\n`;
  fs.writeFileSync(filePath, header + md, 'utf8');

  // Extract internal links
  const links = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    let next;
    try {
      next = new URL(href, url).href;
    } catch { return; }
    const u = new URL(next);
    if (u.host !== BASE_HOST) return;
    // Strip anchors and query
    next = `${u.protocol}//${u.host}${u.pathname}`;
    if (!visited.has(next)) links.add(next);
  });
  return [...links];
}

async function crawl() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const queue = START_URLS.map(u => [u, 0]);
  while (queue.length) {
    const [url, depth] = queue.shift();
    const newLinks = await fetchAndSave(url, depth);
    for (const link of newLinks) {
      queue.push([link, depth + 1]);
    }
    await new Promise(r => setTimeout(r, RATE_MS));
  }
  console.log(`\nDone. Visited ${visited.size} pages. Failed ${failed.length}.`);
  if (failed.length) {
    fs.writeFileSync(path.join(OUTPUT_DIR, '_failed.json'), JSON.stringify(failed, null, 2), 'utf8');
  }
}

crawl().catch(e => { console.error(e); process.exit(1); });
