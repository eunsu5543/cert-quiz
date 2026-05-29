import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('nhn-cloud-essentials-quiz.html', 'utf8');

// Pick the longest <script>...</script> block
const matches = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (matches.length === 0) throw new Error('No <script> block found');
const code = matches
  .map(m => m[1])
  .sort((a, b) => b.length - a.length)[0];

// Build a recursive Proxy that returns itself for any access — makes DOM/window calls a no-op
const noopProxy = new Proxy(function () {}, {
  get: (target, prop) => {
    if (prop === Symbol.toPrimitive) return () => '';
    if (prop === 'then') return undefined; // avoid being awaited
    if (prop === 'length') return 0;
    return noopProxy;
  },
  apply: () => noopProxy,
  construct: () => noopProxy,
  set: () => true,
  has: () => true,
});

const context = {
  console,
  document: noopProxy,
  window: noopProxy,
  localStorage: noopProxy,
  navigator: { userAgent: '' },
  setTimeout: () => 0,
  setInterval: () => 0,
  requestAnimationFrame: () => 0,
  addEventListener: () => {},
};
vm.createContext(context);

try {
  vm.runInContext(
    code + '\nthis.__OUT = { DOMAINS: typeof DOMAINS !== "undefined" ? DOMAINS : null, QUESTIONS: typeof QUESTIONS !== "undefined" ? QUESTIONS : null };',
    context
  );
} catch (e) {
  // Ignore: we only care about DOMAINS/QUESTIONS extraction; later DOM rendering may still fail
  console.warn('[warn] script evaluation threw (may be OK if DOMAINS/QUESTIONS already defined):', e.message);
}

const DOMAINS = context.__OUT?.DOMAINS;
const QUESTIONS = context.__OUT?.QUESTIONS;

if (!DOMAINS) throw new Error('DOMAINS not extracted');
if (!Array.isArray(QUESTIONS) || QUESTIONS.length === 0) throw new Error('QUESTIONS not extracted');

const output = {
  meta: { id: 'nhn-cloud-essentials', name: 'NHN Cloud Essentials' },
  domains: DOMAINS,
  questions: QUESTIONS
};

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/questions.json', JSON.stringify(output, null, 2), 'utf8');
console.log(`Extracted ${QUESTIONS.length} questions across ${Object.keys(DOMAINS).length} domains`);
