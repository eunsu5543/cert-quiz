// Parse NHN Cloud glossary xlsx into JSON.
// File structure: row 0 title, row 1 blank, row 2 meta header, row 3 column header,
// row 4+ data (category rows have only first column filled — skip those).
// Columns: 0=koTerm, 1=enTerm, 2=jaTerm, 3=abbr, 4=relatedLinks, 5=koDef, 6=enDef, 7=jaDef

import fs from 'fs';
import XLSX from 'xlsx';

const INPUT = 'data/source/glossary-raw.xlsx';
const OUTPUT = 'data/source/glossary.json';

const buf = fs.readFileSync(INPUT);
const wb = XLSX.read(buf, { type: 'buffer' });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const items = [];
for (let i = 4; i < rows.length; i++) {
  const r = rows[i];
  const koTerm = String(r[0] || '').trim();
  const enTerm = String(r[1] || '').trim();
  const abbr   = String(r[3] || '').trim();
  const koDef  = String(r[5] || '').trim();
  const enDef  = String(r[6] || '').trim();

  // Skip empty rows and category headers (e.g. "numbers and symbols" without definition)
  if (!koTerm && !enTerm) continue;
  if (!enTerm && !koDef && !enDef) continue;

  items.push({ koTerm, enTerm, abbr, koDef, enDef });
}

fs.writeFileSync(OUTPUT, JSON.stringify(items, null, 2), 'utf8');
console.log(`Wrote ${items.length} glossary entries → ${OUTPUT}`);
console.log('First 3:');
items.slice(0, 3).forEach(it => console.log(`  ${it.koTerm} (${it.enTerm}) — ${it.koDef.slice(0, 50)}...`));
