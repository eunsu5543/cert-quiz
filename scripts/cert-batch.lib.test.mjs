import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateQuestion,
  buildAvoidList,
  resequenceIds, ID_PREFIX,
  appendQuestions, normalizeQ,
  selectSourcePaths, DOMAIN_SOURCE_CANDIDATES,
} from './cert-batch.lib.mjs';

const good = {
  id: 'concept-011', domain: 'concept-security', type: 'single',
  q: '질문?', options: ['A', 'B', 'C', 'D'], answer: [1],
  summary: '토픽을 묻는 문제',
  perOption: ['오답. a', '정답. b', '오답. c', '오답. d'],
  glossary: [], source: [{ type: 'user-guide', url: 'u', path: 'p', section: 's' }],
  status: 'draft',
};

test('valid single question passes', () => {
  assert.deepEqual(validateQuestion(good), { valid: true, errors: [] });
});

test('single must have exactly 4 options', () => {
  const r = validateQuestion({ ...good, options: ['A', 'B', 'C'] });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('options')));
});

test('single must have exactly 1 answer', () => {
  const r = validateQuestion({ ...good, answer: [1, 2] });
  assert.equal(r.valid, false);
});

test('multi must have 5 options and 2+ answers', () => {
  const multi = { ...good, type: 'multi', options: ['A', 'B', 'C', 'D', 'E'],
    answer: [0, 2], perOption: ['정답. a', '오답. b', '정답. c', '오답. d', '오답. e'] };
  assert.equal(validateQuestion(multi).valid, true);
  assert.equal(validateQuestion({ ...multi, answer: [0] }).valid, false);
});

test('perOption length must equal options length', () => {
  const r = validateQuestion({ ...good, perOption: ['정답. b'] });
  assert.equal(r.valid, false);
});

test('each perOption must start with 정답. or 오답.', () => {
  const r = validateQuestion({ ...good, perOption: ['맞음 b', '정답. b', '오답. c', '오답. d'] });
  assert.equal(r.valid, false);
});

test('answer index out of range fails', () => {
  const r = validateQuestion({ ...good, answer: [9] });
  assert.equal(r.valid, false);
});

const sampleDoc = {
  meta: {}, domains: {},
  questions: [
    { id: 'concept-001', domain: 'concept-security', q: 'Q1?', summary: 's1' },
    { id: 'concept-002', domain: 'concept-security', q: 'Q2?', summary: 's2' },
    { id: 'bill-001', domain: 'billing', q: 'B1?', summary: 'sb' },
  ],
};

test('buildAvoidList returns only the target domain stems', () => {
  const list = buildAvoidList(sampleDoc, 'concept-security');
  assert.equal(list.length, 2);
  assert.deepEqual(list.map(x => x.q), ['Q1?', 'Q2?']);
  assert.ok(list[0].summary);
});

test('buildAvoidList empty domain returns []', () => {
  assert.deepEqual(buildAvoidList(sampleDoc, 'service-skill'), []);
});

test('resequenceIds assigns sequential ids after the existing count', () => {
  const approved = [
    { id: 'tmp1', type: 'single', q: 'a', status: 'draft' },
    { id: 'tmp2', type: 'single', q: 'b', status: 'draft' },
  ];
  const out = resequenceIds(approved, 'concept-security', 10);
  assert.deepEqual(out.map(x => x.id), ['concept-011', 'concept-012']);
  assert.ok(out.every(x => x.status === 'approved'));
});

test('ID_PREFIX maps all four domains', () => {
  assert.deepEqual(Object.keys(ID_PREFIX).sort(),
    ['billing', 'concept-security', 'service-feature', 'service-skill']);
});

test('resequenceIds pads to 3 digits', () => {
  const out = resequenceIds([{ q: 'x' }], 'billing', 5);
  assert.equal(out[0].id, 'bill-006');
});

function makeDoc() {
  return { meta: {}, domains: {},
    questions: [{ id: 'concept-001', domain: 'concept-security', type: 'single',
      q: '기존 질문?', options: ['A','B','C','D'], answer: [0],
      summary: 's', perOption: ['정답. a','오답. b','오답. c','오답. d'],
      glossary: [], source: [{type:'user-guide',url:'u',path:'p',section:'x'}], status: 'approved' }] };
}

const valid = {
  domain: 'concept-security', type: 'single', q: '새 질문?',
  options: ['A','B','C','D'], answer: [1], summary: 's2',
  perOption: ['오답. a','정답. b','오답. c','오답. d'],
  glossary: [], source: [{type:'user-guide',url:'u',path:'p',section:'y'}], status: 'approved', id: 'concept-002',
};

test('normalizeQ strips whitespace and case-insensitive', () => {
  assert.equal(normalizeQ('  기존 질문? '), normalizeQ('기존 질문?'));
});

test('appendQuestions adds valid new question', () => {
  const doc = makeDoc();
  const res = appendQuestions(doc, [valid]);
  assert.equal(res.doc.questions.length, 2);
  assert.equal(res.added, 1);
  assert.equal(res.skipped.length, 0);
});

test('appendQuestions skips exact-duplicate q', () => {
  const doc = makeDoc();
  const dup = { ...valid, q: '기존 질문?' };
  const res = appendQuestions(doc, [dup]);
  assert.equal(res.added, 0);
  assert.equal(res.skipped[0].reason, 'duplicate');
});

test('appendQuestions skips schema-invalid q', () => {
  const doc = makeDoc();
  const bad = { ...valid, options: ['A','B'] };
  const res = appendQuestions(doc, [bad]);
  assert.equal(res.added, 0);
  assert.equal(res.skipped[0].reason, 'invalid');
});

test('appendQuestions does not mutate input doc', () => {
  const doc = makeDoc();
  appendQuestions(doc, [valid]);
  assert.equal(doc.questions.length, 1);
});

test('concept-security has candidate source paths', () => {
  assert.ok(DOMAIN_SOURCE_CANDIDATES['concept-security'].length >= 3);
  assert.ok(DOMAIN_SOURCE_CANDIDATES['concept-security']
    .some(p => p.includes('security-policy')));
});

test('selectSourcePaths filters to existing files only', () => {
  const exists = (p) => p.includes('overview') || p.includes('security-policy');
  const out = selectSourcePaths('concept-security', exists);
  assert.ok(out.length >= 2);
  assert.ok(out.every(p => exists(p)));
});

test('selectSourcePaths unknown domain throws', () => {
  assert.throws(() => selectSourcePaths('nope', () => true));
});

// Fix 1: validateQuestion must not throw on null/undefined input
test('validateQuestion(null) returns {valid:false} with errors, does not throw', () => {
  const r = validateQuestion(null);
  assert.equal(r.valid, false);
  assert.ok(Array.isArray(r.errors) && r.errors.length > 0);
});

test('validateQuestion(undefined) returns {valid:false} with errors, does not throw', () => {
  const r = validateQuestion(undefined);
  assert.equal(r.valid, false);
  assert.ok(Array.isArray(r.errors) && r.errors.length > 0);
});

test('appendQuestions skips null element (reason invalid) and still adds valid one', () => {
  const doc = makeDoc();
  const res = appendQuestions(doc, [null, valid]);
  assert.equal(res.added, 1);
  assert.equal(res.skipped.length, 1);
  assert.equal(res.skipped[0].reason, 'invalid');
  assert.equal(res.doc.questions.length, 2);
});

// Fix 2: missing `type` must not also emit "unknown type" error
test('missing type field produces only "missing field" error, not "unknown type"', () => {
  const { type: _t, ...noType } = good;
  const r = validateQuestion(noType);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('missing field: type')));
  assert.ok(!r.errors.some(e => e.includes('unknown type')));
});

// Fix 3: perOption regex must require text after the prefix
test('perOption bare prefix "정답." (no text) fails validation', () => {
  const r = validateQuestion({ ...good, perOption: ['정답.', '정답. b', '오답. c', '오답. d'] });
  assert.equal(r.valid, false);
  assert.ok(r.errors.some(e => e.includes('perOption[0]')));
});

test('perOption "정답. 설명" passes validation', () => {
  const r = validateQuestion({ ...good, perOption: ['정답. 설명', '오답. b', '오답. c', '오답. d'] });
  assert.equal(r.valid, true);
});
