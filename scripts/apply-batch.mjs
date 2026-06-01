#!/usr/bin/env node
// Usage: node scripts/apply-batch.mjs <domain> <approvedJsonPath>
// Loads approved questions (array) produced by the cert-batch workflow,
// resequences IDs after the current domain count, validates + dedups, and
// appends into data/questions.json.
import fs from 'node:fs';
import { resequenceIds, appendQuestions, ID_PREFIX } from './cert-batch.lib.mjs';

const domain = process.argv[2];
const approvedPath = process.argv[3];
if (!domain || !ID_PREFIX[domain] || !approvedPath) {
  console.error('usage: node scripts/apply-batch.mjs <domain> <approvedJsonPath>');
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync('data/questions.json', 'utf8'));
const approved = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
if (!Array.isArray(approved)) { console.error('approved file must be a JSON array'); process.exit(1); }

const have = doc.questions.filter(q => q.domain === domain).length;
const reseq = resequenceIds(approved, domain, have);
const { doc: nextDoc, added, skipped } = appendQuestions(doc, reseq);

fs.writeFileSync('data/questions.json', JSON.stringify(nextDoc, null, 2) + '\n', 'utf8');

const newHave = nextDoc.questions.filter(q => q.domain === domain).length;
console.log(`domain=${domain}: ${have} → ${newHave} (added ${added}, skipped ${skipped.length})`);
for (const s of skipped) console.log(`  skip [${s.reason}] ${s.q?.slice(0, 40)}${s.errors ? ' :: ' + s.errors.join('; ') : ''}`);
