import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateQuestion } from './cert-batch.lib.mjs';

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
