import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestion } from './cert-batch.lib.mjs';
import { buildAvoidList } from './cert-batch.lib.mjs';
import { resequenceIds, ID_PREFIX } from './cert-batch.lib.mjs';

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
