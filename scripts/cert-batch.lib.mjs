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
  // answer must agree with the 정답/오답 markers in perOption. A 0-vs-1-index slip
  // produces an answer that is structurally valid (in range, right cardinality) but
  // semantically wrong — the worst failure for a quiz, and invisible to the checks
  // above. Only enforced when perOption is well-formed, so we don't double-report.
  const perOptWellFormed = Array.isArray(q.perOption) && Array.isArray(q.options)
    && q.perOption.length === q.options.length
    && q.perOption.every(p => typeof p === 'string' && /^(정답|오답)\.\s+\S/.test(p));
  if (perOptWellFormed && Array.isArray(q.answer)) {
    const expected = q.perOption.map((p, i) => (p.startsWith('정답') ? i : -1)).filter(i => i >= 0);
    const got = [...q.answer].sort((a, b) => a - b).join(',');
    const exp = [...expected].sort((a, b) => a - b).join(',');
    if (got !== exp) {
      errors.push(`answer ${JSON.stringify(q.answer)} does not match perOption 정답 markers (expected ${JSON.stringify(expected)})`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// Derive the canonical answer set from a question's perOption 정답 markers and,
// when it disagrees with q.answer, return a corrected copy. perOption (the prose
// explanation shown to learners) is the authoritative answer key; q.answer is just
// a derived index that the generator sometimes emits 1-indexed by mistake. Returns
// { q, fixed, from, to }. Leaves q untouched if perOption is malformed or the
// resulting cardinality would violate the type rule (let validateQuestion catch it).
export function reconcileAnswer(q) {
  if (q == null || typeof q !== 'object') return { q, fixed: false };
  const wellFormed = Array.isArray(q.perOption) && Array.isArray(q.options)
    && q.perOption.length === q.options.length
    && q.perOption.every(p => typeof p === 'string' && /^(정답|오답)\.\s+\S/.test(p));
  if (!wellFormed) return { q, fixed: false };
  const expected = q.perOption.map((p, i) => (p.startsWith('정답') ? i : -1)).filter(i => i >= 0);
  const cardOk = q.type === 'single' ? expected.length === 1 : q.type === 'multi' ? expected.length >= 2 : false;
  if (!cardOk) return { q, fixed: false };
  const got = [...(Array.isArray(q.answer) ? q.answer : [])].sort((a, b) => a - b).join(',');
  const exp = [...expected].sort((a, b) => a - b).join(',');
  if (got === exp) return { q, fixed: false };
  return { q: { ...q, answer: expected }, fixed: true, from: q.answer, to: expected };
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
  // 공식 범위(시험안내서): NHN Cloud의 일반적인 서비스 특징(정책·리소스 제한), 각 상품에 대한
  // 일반적인 설명. → 입문 시험에 실제 출제될 핵심 IaaS 서비스의 overview만 선별(니치 상품 제외).
  'service-feature': [
    `${G}/nhncloud/ko/overview.md`, // 일반 서비스 특징·정책·리소스 제한
    // Compute
    `${G}/Compute/Instance/ko/overview.md`,
    `${G}/Compute/Auto%20Scale/ko/overview.md`,
    `${G}/Compute/Image/ko/overview.md`,
    `${G}/Compute/Instance%20Template/ko/overview.md`,
    `${G}/Compute/GPU%20Instance/ko/overview.md`,
    `${G}/Compute/Cloud%20Functions/ko/overview.md`,
    // Network
    `${G}/Network/VPC/ko/overview.md`,
    `${G}/Network/Floating%20IP/ko/overview.md`,
    `${G}/Network/Internet%20Gateway/ko/overview.md`,
    `${G}/Network/NAT%20Gateway/ko/overview.md`,
    `${G}/Network/Load%20Balancer/ko/overview.md`,
    `${G}/Network/Security%20Groups/ko/overview.md`,
    `${G}/Network/Network%20ACL/ko/overview.md`,
    `${G}/Network/Network%20Interface/ko/overview.md`,
    `${G}/Network/VPN%20Gateway(Site-to-Site%20VPN)/ko/overview.md`,
    `${G}/Network/Peering%20Gateway/ko/overview.md`,
    // Storage
    `${G}/Storage/Block%20Storage/ko/overview.md`,
    `${G}/Storage/Object%20Storage/ko/Overview.md`,
    `${G}/Storage/NAS/ko/overview.md`,
    `${G}/Storage/Backup/ko/overview.md`,
    // Database
    `${G}/Database/RDS%20for%20MySQL/ko/overview.md`,
    `${G}/Database/RDS%20for%20MariaDB/ko/overview.md`,
    `${G}/Database/RDS%20for%20PostgreSQL/ko/overview.md`,
    `${G}/Database/EasyCache/ko/overview.md`,
    // Container
    `${G}/Container/NKS/ko/overview.md`,
    `${G}/Container/NCR/ko/overview.md`,
    `${G}/Container/NCS/ko/overview.md`,
    // 2차 확장: overview만으로는 ~72에서 천장 → 개념·기능 페이지 추가(시험범위=사용자 가이드 전체).
    // 순수 console-guide(메뉴·입력값 트리비아)는 제외하고 개념/기능 중심 페이지만. RDS는
    // MySQL을 대표로(MariaDB/PostgreSQL은 내용 거의 동일 → 교차 중복 방지), PostgreSQL 고유의
    // db-extension만 추가.
    `${G}/Compute/Instance/ko/component-guide.md`,
    `${G}/Compute/Cloud%20Functions/ko/trigger-guide.md`,
    `${G}/Storage/Object%20Storage/ko/acl-guide.md`,
    `${G}/Storage/Object%20Storage/ko/container-policy-guide.md`,
    `${G}/Database/RDS%20for%20MySQL/ko/db-instance.md`,
    `${G}/Database/RDS%20for%20MySQL/ko/db-engine.md`,
    `${G}/Database/RDS%20for%20MySQL/ko/backup-and-restore.md`,
    `${G}/Database/RDS%20for%20MySQL/ko/db-security-group.md`,
    `${G}/Database/RDS%20for%20PostgreSQL/ko/db-extension.md`,
    `${G}/Container/NKS/ko/user-guide.md`,
    `${G}/Container/NCR/ko/user-guide.md`,
  ],
  // 공식 범위(시험안내서): "NHN Cloud 상품 활용 기술 영역, 조직/프로젝트 개념 활용"(40%).
  // → service-feature(상품 "무엇" = overview)와 구분되는 "어떻게 쓰나"(활용/조작/조직관리).
  // 핵심: ① 조직/프로젝트/IAM 거버넌스 활용 ② API 인증 활용 ③ 핵심 IaaS 상품 console-guide
  // (활용 기술). service-feature가 쓴 overview/concept 파일과 겹치지 않게 console-guide만 선별.
  // 콘솔 클릭 단계·메뉴명·입력 글자수 트리비아는 검수기/표본점검이 제외(활용 "기술" 개념만 채택).
  'service-skill': [
    // 조직/프로젝트/IAM 활용 (도메인의 명시 범위 — 천장 높고 트리비아 낮음)
    `${G}/nhncloud/ko/console-guide.md`,       // 조직·IAM 거버넌스·프로젝트 관리·역할그룹
    `${G}/nhncloud/ko/console-user-guide.md`,  // 조직/프로젝트 개념·용어·권한
    // API 활용
    `${G}/nhncloud/ko/public-api/auth-method-overview.md`, // 공통 API 인증 방식(개념)
    // 핵심 IaaS 상품 활용 기술 (console-guide — feature의 overview와 다른 파일)
    `${G}/Compute/Instance/ko/console-guide.md`,
    `${G}/Compute/Auto%20Scale/ko/console-guide.md`,
    `${G}/Network/VPC/ko/console-guide.md`,
    `${G}/Network/Floating%20IP/ko/console-guide.md`,
    `${G}/Network/Load%20Balancer/ko/console-guide.md`,
    `${G}/Network/Security%20Groups/ko/console-guide.md`,
    `${G}/Storage/Block%20Storage/ko/console-guide.md`,
    `${G}/Storage/Object%20Storage/ko/console-guide.md`,
    `${G}/Storage/NAS/ko/console-guide.md`,
    `${G}/Container/NCS/ko/user-guide.md`,     // NKS/NCR은 feature가 사용 → NCS만
  ],
  // 공식 범위(시험안내서): 결제/요금. 캐시에 billing 전용 페이지가 적어 nhncloud 이용
  // 안내(결제수단·크레딧·약정·요금 정책)를 1차 소스로, eTax(전자세금계산서)를 보조로.
  // 콘솔 클릭 단계·카드 검증 금액 등 운영 트리비아는 검수기/표본점검에서 제외.
  'billing': [
    `${G}/nhncloud/ko/user-guide.md`,      // 결제 수단·요금·크레딧·약정 등 이용 안내(결제 정책 핵심)
    `${G}/nhncloud/ko/resource-policy.md`, // 리소스 제공/크레딧 정책
    `${G}/nhncloud/ko/overview.md`,        // 과금 모델·합리적 가격 정책 개요
    `${G}/Bill/eTax/ko/overview.md`,       // 전자세금계산서(개념)
    `${G}/Bill/eTax/ko/service-guide.md`,
  ],
};

export function selectSourcePaths(domain, exists = existsSync) {
  const cands = DOMAIN_SOURCE_CANDIDATES[domain];
  if (!cands) throw new Error(`unknown domain: ${domain}`);
  return cands.filter(p => exists(p));
}
