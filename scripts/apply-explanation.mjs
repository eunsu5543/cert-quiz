// Apply enriched explanation (summary + perOption) to a question in data/questions.json.
// Usage:
//   node scripts/apply-explanation.mjs <questionId> <jsonFilePath>
// where <jsonFilePath> points to a file with the agent's JSON output ({summary, perOption}).
// This intentionally keeps the script tiny and easy to re-run as more samples land.

import fs from 'fs';

const [, , idArg, jsonPath] = process.argv;
if (!idArg || !jsonPath) {
  console.error('usage: node scripts/apply-explanation.mjs <questionId> <agent-output.json>');
  process.exit(1);
}
const id = Number(idArg);

const dataPath = 'data/questions.json';
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const enrichment = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const q = data.questions.find(x => x.id === id);
if (!q) {
  console.error(`question id=${id} not found`);
  process.exit(1);
}
if (!Array.isArray(enrichment.perOption) || enrichment.perOption.length !== q.options.length) {
  console.error(`perOption length mismatch: got ${enrichment.perOption?.length}, expected ${q.options.length}`);
  process.exit(1);
}

q.summary = enrichment.summary;
q.perOption = enrichment.perOption;

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
console.log(`Applied enrichment to question id=${id} (${q.options.length} options).`);
