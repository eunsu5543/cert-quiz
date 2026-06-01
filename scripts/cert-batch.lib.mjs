// Pure helpers for the cert-batch automation. No side effects except the
// explicit file readers/writers at the bottom (apply/prepare CLIs call those).

import { existsSync } from 'node:fs';

const REQUIRED = ['id', 'domain', 'type', 'q', 'options', 'answer', 'summary', 'perOption', 'source'];

export function validateQuestion(q) {
  if (q == null || typeof q !== 'object') {
    return { valid: false, errors: ['not an object'] };
  }
  const errors = [];
  for (const k of REQUIRED) {
    if (q[k] === undefined || q[k] === null) errors.push(`missing field: ${k}`);
  }
  if (q.type === 'single') {
    if (!Array.isArray(q.options) || q.options.length !== 4) errors.push('single: options must be length 4');
    if (!Array.isArray(q.answer) || q.answer.length !== 1) errors.push('single: answer must be length 1');
  } else if (q.type === 'multi') {
    if (!Array.isArray(q.options) || q.options.length !== 5) errors.push('multi: options must be length 5');
    if (!Array.isArray(q.answer) || q.answer.length < 2) errors.push('multi: answer must have 2+');
  } else if (q.type !== undefined && q.type !== null) {
    errors.push(`unknown type: ${q.type}`);
  }
  if (Array.isArray(q.options) && Array.isArray(q.perOption) && q.perOption.length !== q.options.length) {
    errors.push('perOption length must equal options length');
  }
  if (Array.isArray(q.perOption)) {
    for (const [i, p] of q.perOption.entries()) {
      if (typeof p !== 'string' || !/^(정답|오답)\.\s+\S/.test(p)) errors.push(`perOption[${i}] must start with 정답. or 오답.`);
    }
  }
  if (Array.isArray(q.answer) && Array.isArray(q.options)) {
    for (const a of q.answer) {
      if (!Number.isInteger(a) || a < 0 || a >= q.options.length) errors.push(`answer index out of range: ${a}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function buildAvoidList(doc, domain) {
  return doc.questions
    .filter(q => q.domain === domain)
    .map(q => ({ id: q.id, q: q.q, summary: q.summary }));
}

export const ID_PREFIX = {
  'concept-security': 'concept',
  'service-feature': 'feature',
  'service-skill': 'skill',
  'billing': 'bill',
};

export function resequenceIds(approved, domain, haveCount) {
  const prefix = ID_PREFIX[domain];
  if (!prefix) throw new Error(`unknown domain: ${domain}`);
  return approved.map((q, i) => ({
    ...q,
    id: `${prefix}-${String(haveCount + i + 1).padStart(3, '0')}`,
    domain,
    status: 'approved',
  }));
}

export function normalizeQ(q) {
  return String(q).replace(/\s+/g, ' ').trim().toLowerCase();
}

export function appendQuestions(doc, newQuestions) {
  const next = { ...doc, questions: [...doc.questions] };
  const seen = new Set(doc.questions.map(q => normalizeQ(q.q)));
  const skipped = [];
  let added = 0;
  for (const q of newQuestions) {
    const v = validateQuestion(q);
    if (!v.valid) { skipped.push({ q: q != null ? q.q : null, reason: 'invalid', errors: v.errors }); continue; }
    const key = normalizeQ(q.q);
    if (seen.has(key)) { skipped.push({ q: q.q, reason: 'duplicate' }); continue; }
    seen.add(key);
    next.questions.push(q);
    added++;
  }
  return { doc: next, added, skipped };
}

const G = 'data/source/guide/ko';
export const DOMAIN_SOURCE_CANDIDATES = {
  // 공식 범위(시험안내서): 클라우드 컴퓨팅 개념·특징, 책임공유 모델, 일반적인 클라우드 보안 개념.
  // → NHN 특정 제품 기능(Floating IP/NAT/Public API 인증 등)이 아니라 "일반 개념" 수준 소스만.
  'concept-security': [
    `${G}/nhncloud/ko/overview.md`,        // 클라우드 개념·서비스모델·리전/AZ·책임공유
    `${G}/nhncloud/ko/security-policy.md`, // 일반 보안: DRDoS·비밀번호·포트차단
    `${G}/nhncloud/ko/resource-policy.md`,
    `${G}/nhncloud/ko/region-guide.md`,
    `${G}/nhncloud/ko/user-guide.md`,
    // 일반적인 클라우드 보안 개념 (제품이 아닌 개념 차원 — 보안그룹/ACL/키관리)
    `${G}/Network/Security%20Groups/ko/overview.md`,
    `${G}/Network/Network%20ACL/ko/overview.md`,
    `${G}/Security/Secure%20Key%20Manager/ko/overview.md`,
  ],
  'service-feature': [`${G}/nhncloud/ko/overview.md`],
  'service-skill': [`${G}/nhncloud/ko/overview.md`],
  'billing': [`${G}/nhncloud/ko/user-guide.md`],
};

export function selectSourcePaths(domain, exists = existsSync) {
  const cands = DOMAIN_SOURCE_CANDIDATES[domain];
  if (!cands) throw new Error(`unknown domain: ${domain}`);
  return cands.filter(p => exists(p));
}
