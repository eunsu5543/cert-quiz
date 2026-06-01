#!/usr/bin/env node
// Usage: node scripts/prepare-batch.mjs <domain> [batchSize]
// Reads data/questions.json, computes how many to generate, builds the avoid
// list and source paths, and writes data/staging/<domain>/_batch-args.json.
import fs from 'node:fs';
import path from 'node:path';
import { buildAvoidList, selectSourcePaths, ID_PREFIX } from './cert-batch.lib.mjs';

const domain = process.argv[2];
const batchSize = Number(process.argv[3] || 8);
if (!domain || !ID_PREFIX[domain]) {
  console.error(`usage: node scripts/prepare-batch.mjs <${Object.keys(ID_PREFIX).join('|')}> [batchSize]`);
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));
const target = doc.domains[domain]?.target;
if (!target) { console.error(`no target for domain ${domain}`); process.exit(1); }

const have = doc.questions.filter(q => q.domain === domain).length;
const need = Math.max(0, target - have);
const sourcePaths = selectSourcePaths(domain);
if (sourcePaths.length === 0) {
  console.error(`✗ no source guide files found for ${domain} — re-crawl before generating`);
  process.exit(2);
}

const args = {
  domain,
  domainName: doc.domains[domain].name,
  batchSize,
  need,
  haveCount: have,
  sourcePaths,
  glossaryPath: 'data/source/glossary.json',
  avoidList: buildAvoidList(doc, domain),
};

const outDir = path.join('data/staging', domain);
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, '_batch-args.json');
fs.writeFileSync(outFile, JSON.stringify(args, null, 2), 'utf8');

console.log(`domain=${domain} have=${have} target=${target} need=${need}`);
console.log(`sourcePaths (${sourcePaths.length}):`);
for (const p of sourcePaths) console.log('  -', p);
console.log(`avoidList=${args.avoidList.length} terms`);
console.log(`→ wrote ${outFile}`);
if (need === 0) console.log('nothing to generate (already at target).');
