# cert-batch 자동화 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 문제 생성 → 에이전트 검수 → `data/questions.json` 자동 반영을 사람 개입 0으로 수행하는 재사용 워크플로를 구축하고, 1차로 concept-security를 45개까지 완성한다.

**Architecture:** Workflow 스크립트는 샌드박스(FS 접근 불가)라 **생성→검수 루프만** 담당하고 검증된 문제 데이터를 반환한다. 파일 입출력(기존 문제 로드·avoidList 구성·ID 재부여·append)은 메인 루프에서 Node CLI 스크립트(`prepare-batch.mjs`, `apply-batch.mjs`)가 처리한다. 순수 로직은 `cert-batch.lib.mjs`로 분리해 `node --test`로 단위 테스트한다.

**Tech Stack:** Node.js (ESM, built-in `node:test`/`node:assert`), Claude Code Workflow 툴, 기존 `question-generator`(sonnet) 에이전트 + 신규 `question-reviewer` 에이전트.

---

## 파일 구조

| 파일 | 책임 |
|---|---|
| `scripts/cert-batch.lib.mjs` | 순수 함수: 스키마 검증, avoidList 구성, ID 재부여, append, 도메인별 소스경로 선별 |
| `scripts/cert-batch.lib.test.mjs` | 위 함수 단위 테스트 (`node --test`) |
| `scripts/prepare-batch.mjs` | CLI: domain → 워크플로 args(JSON) 생성 (need/idStart/avoidList/sourcePaths) |
| `scripts/apply-batch.mjs` | CLI: 워크플로 산출 approved JSON → questions.json에 검증·재부여·append |
| `.claude/agents/question-reviewer.md` | 검수 에이전트 (루브릭: 공식 샘플 깊이 정합 + 중복) |
| `.claude/workflows/cert-batch.js` | Workflow: 생성→검수 루프, approved 데이터 반환 |
| `package.json` | `test` 스크립트 추가 |

**데이터 계약 (모든 파일 공유):** v2 질문 객체는
`{ id, domain, type:"single"|"multi", q, options[], answer:number[], summary, perOption[], glossary[], source[], status }` 형태.
`questions.json` 최상위 키: `meta`, `domains`, `questions`.

---

## Task 1: 테스트 스크립트 등록

**Files:**
- Modify: `package.json`

- [ ] **Step 1: package.json에 test 스크립트 추가**

`scripts` 블록을 아래로 교체:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "node --test scripts/"
  },
```

- [ ] **Step 2: 빈 통과 확인 (러너 동작 확인)**

Run: `npm test`
Expected: "tests 0" 류 메시지, exit 0 (아직 테스트 파일 없음 — 러너가 도는지만 확인).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add node --test runner script"
```

---

## Task 2: `validateQuestion` — v2 스키마 검증 (TDD)

**Files:**
- Create: `scripts/cert-batch.lib.mjs`
- Create: `scripts/cert-batch.lib.test.mjs`

- [ ] **Step 1: 실패 테스트 작성**

`scripts/cert-batch.lib.test.mjs`:

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `validateQuestion` is not a function / 모듈 없음.

- [ ] **Step 3: 최소 구현**

`scripts/cert-batch.lib.mjs`:

```js
// Pure helpers for the cert-batch automation. No side effects except the
// explicit file readers/writers at the bottom (apply/prepare CLIs call those).

const REQUIRED = ['id', 'domain', 'type', 'q', 'options', 'answer', 'summary', 'perOption', 'source'];

export function validateQuestion(q) {
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
  } else {
    errors.push(`unknown type: ${q.type}`);
  }
  if (Array.isArray(q.options) && Array.isArray(q.perOption) && q.perOption.length !== q.options.length) {
    errors.push('perOption length must equal options length');
  }
  if (Array.isArray(q.perOption)) {
    for (const [i, p] of q.perOption.entries()) {
      if (typeof p !== 'string' || !/^(정답|오답)\./.test(p)) errors.push(`perOption[${i}] must start with 정답. or 오답.`);
    }
  }
  if (Array.isArray(q.answer) && Array.isArray(q.options)) {
    for (const a of q.answer) {
      if (!Number.isInteger(a) || a < 0 || a >= q.options.length) errors.push(`answer index out of range: ${a}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS (모든 validateQuestion 테스트 통과).

- [ ] **Step 5: Commit**

```bash
git add scripts/cert-batch.lib.mjs scripts/cert-batch.lib.test.mjs
git commit -m "feat: add validateQuestion schema check with tests"
```

---

## Task 3: `buildAvoidList` — 도메인 기존 문제 추출 (TDD)

**Files:**
- Modify: `scripts/cert-batch.lib.mjs`
- Modify: `scripts/cert-batch.lib.test.mjs`

- [ ] **Step 1: 실패 테스트 추가** (파일 끝에 append)

```js
import { buildAvoidList } from './cert-batch.lib.mjs';

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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `buildAvoidList` is not a function.

- [ ] **Step 3: 최소 구현** (`cert-batch.lib.mjs`에 추가)

```js
export function buildAvoidList(doc, domain) {
  return doc.questions
    .filter(q => q.domain === domain)
    .map(q => ({ id: q.id, q: q.q, summary: q.summary }));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/cert-batch.lib.mjs scripts/cert-batch.lib.test.mjs
git commit -m "feat: add buildAvoidList for dedup seeding"
```

---

## Task 4: `resequenceIds` — ID 재부여 + status 승인 (TDD)

**Files:**
- Modify: `scripts/cert-batch.lib.mjs`
- Modify: `scripts/cert-batch.lib.test.mjs`

도메인별 ID prefix는 고정 맵을 쓴다: `concept-security→concept`, `service-feature→feature`, `service-skill→skill`, `billing→bill`.

- [ ] **Step 1: 실패 테스트 추가**

```js
import { resequenceIds, ID_PREFIX } from './cert-batch.lib.mjs';

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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `resequenceIds` / `ID_PREFIX` 없음.

- [ ] **Step 3: 최소 구현** (`cert-batch.lib.mjs`에 추가)

```js
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
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/cert-batch.lib.mjs scripts/cert-batch.lib.test.mjs
git commit -m "feat: add resequenceIds + ID_PREFIX map"
```

---

## Task 5: `appendQuestions` — 검증·중복 backstop·병합 (TDD)

**Files:**
- Modify: `scripts/cert-batch.lib.mjs`
- Modify: `scripts/cert-batch.lib.test.mjs`

검수 에이전트가 의미 중복을 잡지만, 기계적 backstop으로 **정규화된 `q` 완전일치**는 제외한다. 스키마 불합격 문제도 제외하고 그 사유를 리턴한다.

- [ ] **Step 1: 실패 테스트 추가**

```js
import { appendQuestions, normalizeQ } from './cert-batch.lib.mjs';

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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `appendQuestions` / `normalizeQ` 없음.

- [ ] **Step 3: 최소 구현** (`cert-batch.lib.mjs`에 추가)

```js
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
    if (!v.valid) { skipped.push({ q: q.q, reason: 'invalid', errors: v.errors }); continue; }
    const key = normalizeQ(q.q);
    if (seen.has(key)) { skipped.push({ q: q.q, reason: 'duplicate' }); continue; }
    seen.add(key);
    next.questions.push(q);
    added++;
  }
  return { doc: next, added, skipped };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/cert-batch.lib.mjs scripts/cert-batch.lib.test.mjs
git commit -m "feat: add appendQuestions with dedup + schema backstop"
```

---

## Task 6: `selectSourcePaths` — 도메인별 시험범위 소스 선별 (TDD)

**Files:**
- Modify: `scripts/cert-batch.lib.mjs`
- Modify: `scripts/cert-batch.lib.test.mjs`

도메인별 후보 경로 맵을 두고, **실재하는 파일만** 반환한다(존재 확인 함수는 주입 가능하게 해서 테스트). concept-security 후보는 nhncloud 정책·개요·리전·보안 페이지.

- [ ] **Step 1: 실패 테스트 추가**

```js
import { selectSourcePaths, DOMAIN_SOURCE_CANDIDATES } from './cert-batch.lib.mjs';

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
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `selectSourcePaths` 없음.

- [ ] **Step 3: 최소 구현** (`cert-batch.lib.mjs`에 추가)

`existsSync`를 기본 인자로 주입한다 (테스트에서 가짜 함수 전달).

```js
import { existsSync } from 'node:fs';

const G = 'data/source/guide/ko';
export const DOMAIN_SOURCE_CANDIDATES = {
  'concept-security': [
    `${G}/nhncloud/ko/overview.md`,
    `${G}/nhncloud/ko/security-policy.md`,
    `${G}/nhncloud/ko/resource-policy.md`,
    `${G}/nhncloud/ko/region-guide.md`,
    `${G}/nhncloud/ko/user-guide.md`,
    `${G}/nhncloud/ko/public-api/overview.md`,
    `${G}/nhncloud/ko/public-api/auth-method-overview.md`,
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
```

> 참고: `service-feature`/`service-skill`/`billing` 후보는 placeholder 1개만 둔다(이번 범위는 concept-security). 해당 도메인 차례에 확장. generator 에이전트는 Glob/Grep으로 추가 소스를 보강할 수 있으므로 seed로 충분.

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/cert-batch.lib.mjs scripts/cert-batch.lib.test.mjs
git commit -m "feat: add selectSourcePaths with existence filtering"
```

---

## Task 7: `prepare-batch.mjs` CLI — 워크플로 args 생성

**Files:**
- Create: `scripts/prepare-batch.mjs`

`node scripts/prepare-batch.mjs <domain> [batchSize]` → `data/staging/<domain>/_batch-args.json` 작성 + 콘솔에 요약. 소스가 1개도 없으면 비-제로 종료(타깃 소스 점검 게이트).

- [ ] **Step 1: 구현**

```js
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
```

- [ ] **Step 2: 실행 확인 (concept-security)**

Run: `node scripts/prepare-batch.mjs concept-security`
Expected 출력 골자:
```
domain=concept-security have=10 target=45 need=35
sourcePaths (N):
  - data/source/guide/ko/nhncloud/ko/overview.md
  ...
avoidList=10 terms
→ wrote data/staging/concept-security/_batch-args.json
```
sourcePaths가 비어 있으면(존재 0) 여기서 멈추고 크롤 보강 필요 — 그 경우 보고하고 사용자 확인.

- [ ] **Step 3: `_batch-args.json`은 커밋 제외 (산출물)**

`.gitignore`에 추가:

```
data/staging/*/_batch-args.json
data/staging/*/_approved.json
```

- [ ] **Step 4: Commit**

```bash
git add scripts/prepare-batch.mjs .gitignore
git commit -m "feat: add prepare-batch CLI to build workflow args"
```

---

## Task 8: `apply-batch.mjs` CLI — questions.json 반영

**Files:**
- Create: `scripts/apply-batch.mjs`

`node scripts/apply-batch.mjs <domain> <approvedJsonPath>` → approved 배열을 재부여·검증·append 후 questions.json 저장. 들여쓰기 2칸 유지.

- [ ] **Step 1: 구현**

```js
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
```

- [ ] **Step 2: 드라이 검증 (가짜 입력으로 동작 확인)**

임시 파일로 1문제 append 테스트:

```bash
node -e "const fs=require('fs');fs.writeFileSync('data/staging/_tmp.json',JSON.stringify([{domain:'concept-security',type:'single',q:'__TMP 검증 질문?',options:['A','B','C','D'],answer:[0],summary:'tmp',perOption:['정답. a','오답. b','오답. c','오답. d'],glossary:[],source:[{type:'user-guide',url:'u',path:'p',section:'s'}],status:'approved'}]))"
node scripts/apply-batch.mjs concept-security data/staging/_tmp.json
```
Expected: `concept-security: 10 → 11 (added 1, skipped 0)`, 새 id `concept-011`.

- [ ] **Step 3: 드라이 검증 되돌리기 (실데이터 오염 방지)**

```bash
git checkout data/questions.json
rm data/staging/_tmp.json
```
Expected: `git status`에서 questions.json 변경 없음.

- [ ] **Step 4: Commit**

```bash
git add scripts/apply-batch.mjs
git commit -m "feat: add apply-batch CLI to merge approved questions"
```

---

## Task 9: `question-reviewer` 검수 에이전트 정의

**Files:**
- Create: `.claude/agents/question-reviewer.md`

루브릭은 합의대로 **2가지로 좁힘**: (1) 공식 샘플 8문제 깊이 정합, (2) 중복 아님. 스키마/출처 기계검증은 lib가 별도로 하므로 여기선 핵심 판정만.

- [ ] **Step 1: 작성**

```markdown
---
name: question-reviewer
description: Review one generated NHN Cloud Essentials quiz question and decide pass/reject against the official sample-8 difficulty bar and duplication. Returns a structured verdict.
tools: Read, Glob, Grep
model: sonnet
---

당신은 NHN Cloud Certified - Essentials 모의고사 **검수자**입니다. 생성된 문제 1개를 받아 **합격(pass) / 탈락(reject)**을 판정합니다. 사람을 대신해 자동 검수하므로, 애매하면 **보수적으로 reject**하고 사유를 구체적으로 답니다.

# 입력 (dispatcher가 제공)

- `question`: 검수 대상 v2 스키마 문제 객체 (JSON)
- `avoidList`: 이미 채택된 같은 도메인 문제들의 `{q, summary}` 배열 (중복 비교 기준)

# 판정 기준 (이 2가지만)

## 기준 1 — 난이도 정합 (공식 샘플 깊이)

먼저 `docs/nhn-cloud-essentials-sample-questions.md`(공식 샘플 8문제)를 Read 해서 출제 깊이를 기준선으로 잡는다. 8문제는 모두 **개념·용도·정책·분류·책임분리** 차원이며 **외울 세부값을 쓰지 않는다.**

reject 해야 하는 경우:
- 정답을 맞히려면 **외울 거리**(숫자·명명 규칙·순서값·세부 설정값, 예: "3~40자", "rule 101번", "8~15자")가 필요함
- **문서 내부 식별자**에 의존("시나리오 3", "표 2 참고")해 자기완결적이지 않음
- console-guide 깊은 운영 디테일에서만 답할 수 있어 개요·정책 수준을 넘어섬
- 해설이 "가이드는~/문서는~" 같은 메타 주어를 사용 (사실 단정 서술이 아님)

pass 조건: 공식 샘플 8문제와 **같은 출제 차원**(개념/용도/정책/분류/책임)이고 자기완결적이며 해설 톤이 단정 서술.

## 기준 2 — 중복 아님

`avoidList`의 각 항목과 비교해, **같은 토픽·같은 정답 포인트**를 묻는 문제면 reject (표현만 다른 사실상 동일 문제 포함). 다른 보기 구성이라도 핵심 묻는 바가 겹치면 중복으로 본다.

# 출력

반드시 StructuredOutput 도구로 아래 형태를 반환:

- `verdict`: "pass" | "reject"
- `reasons`: 문자열 배열. reject면 구체적 사유(어느 기준 위반 + 무엇을). pass면 빈 배열 또는 한 줄 근거.

생성 에이전트가 사유를 보고 다음 라운드를 개선하므로, reject 사유는 **재생성에 도움되도록 actionable**하게 쓴다. 예: "기준1 위반: 'rule 101번' 순서값 암기 요구 → 보안그룹과 ACL의 개념적 차이를 묻는 형태로 교체".
```

- [ ] **Step 2: 형식 확인 (frontmatter 유효성)**

Run: `node -e "const fs=require('fs');const t=fs.readFileSync('.claude/agents/question-reviewer.md','utf8');console.log(t.startsWith('---')&&t.includes('name: question-reviewer')?'ok':'BAD')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add .claude/agents/question-reviewer.md
git commit -m "feat: add question-reviewer agent (sample-depth + dedup rubric)"
```

---

## Task 10: `cert-batch` 워크플로 스크립트

**Files:**
- Create: `.claude/workflows/cert-batch.js`

Workflow 툴로 실행. `args`는 `prepare-batch.mjs` 산출 `_batch-args.json` 내용(JSON 값)을 그대로 전달. FS 접근 없음 — 생성→검수 루프만 돌리고 approved 배열 반환.

- [ ] **Step 1: 작성**

```js
export const meta = {
  name: 'cert-batch',
  description: 'Generate NHN Cloud Essentials questions for one domain, agent-review each, return approved set',
  phases: [
    { title: 'Generate', detail: 'question-generator batches' },
    { title: 'Review', detail: 'question-reviewer per question' },
  ],
}

// args = { domain, domainName, batchSize, need, haveCount, sourcePaths, glossaryPath, avoidList }
const A = args || {}
const need = A.need || 0
const batchSize = A.batchSize || 8
const maxRounds = Math.ceil(need / Math.max(1, batchSize)) + 5

const VERDICT = {
  type: 'object',
  required: ['verdict', 'reasons'],
  properties: {
    verdict: { type: 'string', enum: ['pass', 'reject'] },
    reasons: { type: 'array', items: { type: 'string' } },
  },
}

const approved = []
const rejectFeedback = []
let round = 0

if (need === 0) {
  return { approved: [], rounds: 0, note: 'need=0, nothing to generate' }
}

while (approved.length < need && round < maxRounds) {
  round++
  const remaining = need - approved.length
  const thisBatch = Math.min(batchSize, remaining + 2) // slight over-generate to absorb rejects
  const avoidStems = [
    ...(A.avoidList || []).map(x => x.q),
    ...approved.map(q => q.q),
    ...rejectFeedback.slice(-12).map(r => r.q),
  ]

  const genPrompt = [
    `도메인: ${A.domain} (${A.domainName})`,
    `이번 라운드 생성 개수: ${thisBatch}`,
    `참조 소스 경로 (이 안에서만 출제):`,
    ...(A.sourcePaths || []).map(p => `  - ${p}`),
    `glossaryPath: ${A.glossaryPath || ''}`,
    `idStart: ${A.domain}-tmp (dispatcher가 최종 ID 재부여하므로 임시 ID 사용)`,
    ``,
    `다음 질문들과 토픽이 겹치지 않게 생성하라 (중복 금지):`,
    ...avoidStems.map(s => `  - ${s}`),
    rejectFeedback.length ? `\n직전 탈락 사유(반복 금지):` : ``,
    ...rejectFeedback.slice(-8).map(r => `  - ${r.reasons.join('; ')}`),
    ``,
    `출력: v2 스키마 문제 JSON 배열만. fence/주석 없이.`,
  ].join('\n')

  const raw = await agent(genPrompt, {
    agentType: 'question-generator', phase: 'Generate', label: `gen-r${round}`,
  })

  let batch
  try {
    batch = JSON.parse(raw)
  } catch {
    log(`round ${round}: JSON parse 실패, 스킵`)
    continue
  }
  batch = (Array.isArray(batch) ? batch : []).filter(q => q && !q._warning && q.q)
  if (batch.length === 0) { log(`round ${round}: 빈 배치`); continue }

  const reviewed = await parallel(batch.map(q => () =>
    agent(
      [
        `다음 문제를 검수하라.`,
        `question:`, JSON.stringify(q, null, 2),
        ``,
        `avoidList (중복 비교 기준):`,
        JSON.stringify((A.avoidList || []).map(x => ({ q: x.q, summary: x.summary }))
          .concat(approved.map(a => ({ q: a.q, summary: a.summary }))), null, 2),
      ].join('\n'),
      { agentType: 'question-reviewer', phase: 'Review', label: `rev-r${round}`, schema: VERDICT },
    ).then(v => ({ q, v })).catch(() => null)
  ))

  for (const item of reviewed.filter(Boolean)) {
    const { q, v } = item
    if (v && v.verdict === 'pass' && approved.length < need) {
      approved.push(q)
    } else if (v && v.verdict === 'reject') {
      rejectFeedback.push({ q: q.q, reasons: v.reasons || [] })
    }
  }
  log(`round ${round}: approved ${approved.length}/${need} (이번 통과 ${reviewed.filter(x => x && x.v && x.v.verdict === 'pass').length})`)
}

if (approved.length < need) {
  log(`⚠ 목표 미달: ${approved.length}/${need} (rounds=${round}). 부족분은 다음 실행에서 채울 것.`)
}

return {
  approved: approved.slice(0, need),
  count: approved.length,
  need,
  rounds: round,
  rejectedCount: rejectFeedback.length,
  rejectReasons: rejectFeedback.slice(-15),
}
```

- [ ] **Step 2: 문법 점검 (파싱만)**

Run: `node --check .claude/workflows/cert-batch.js`
Expected: 에러 없음 (exit 0). `export`/`args`/`agent`는 워크플로 런타임 전용이지만 `--check`는 문법만 검사 → 통과.

- [ ] **Step 3: Commit**

```bash
git add .claude/workflows/cert-batch.js
git commit -m "feat: add cert-batch workflow (generate->review loop)"
```

---

## Task 11: 드라이런 통합 — 소량(need=3)으로 파이프라인 검증

**Files:** (코드 변경 없음 — 실행/검증)

실제 35개 전에, **need를 3으로 축소**해 전체 흐름(prepare → workflow → 저장 → apply)을 검증한다.

- [ ] **Step 1: args 생성**

Run: `node scripts/prepare-batch.mjs concept-security`
Expected: `_batch-args.json` 작성, `need=35` 표시.

- [ ] **Step 2: 드라이런용 need 축소**

`_batch-args.json`을 열어 `"need": 35` → `"need": 3` 으로 수정 (Edit). 다른 필드 유지.

- [ ] **Step 3: 워크플로 실행 (Workflow 툴)**

Workflow 툴을 `name: "cert-batch"`, `args`: `_batch-args.json`의 (need=3으로 수정된) JSON 내용으로 호출.
Expected: `approved` 배열 길이 3, 각 항목이 v2 스키마. 진행 로그에 round별 approved 카운트.

- [ ] **Step 4: 산출물 저장 + 반영**

워크플로 반환 `approved` 배열을 `data/staging/concept-security/_approved.json`에 저장(Write) 후:

Run: `node scripts/apply-batch.mjs concept-security data/staging/concept-security/_approved.json`
Expected: `concept-security: 10 → 13 (added 3, skipped 0)`. id `concept-011~013`.

- [ ] **Step 5: 결과 육안 점검 + 판단**

추가된 3문제를 Read로 확인: 샘플 깊이 정합·중복 없음·스키마 정상인지. 문제 있으면 reviewer 루브릭 또는 generator 프롬프트를 보정하고 드라이런 반복.

- [ ] **Step 6: 드라이런 결과 되돌릴지 결정**

3문제 품질이 양호하면 **유지**(이미 approved 반영됨, 본런에서 need가 32로 줄어듦).
품질 미흡이면 되돌림: `git checkout data/questions.json`.
어느 쪽이든 사용자에게 3문제 샘플과 함께 본런 진행 여부 확인.

- [ ] **Step 7: Commit (유지하는 경우)**

```bash
git add data/questions.json
git commit -m "feat: concept-security +3 via cert-batch dry run"
```

---

## Task 12: 본런 — concept-security 45개 완성

**Files:** (실행/검증)

- [ ] **Step 1: 최신 args 재생성**

Run: `node scripts/prepare-batch.mjs concept-security`
Expected: `need` = 45 − 현재개수 (드라이런 3 유지 시 32, 미유지 시 35).

- [ ] **Step 2: 워크플로 본런**

Workflow 툴 `name: "cert-batch"`, args = `_batch-args.json` 내용(원래 need 그대로).
Expected: `approved` 길이 = need (미달 시 로그 경고 + 부족분 표시).

- [ ] **Step 3: 저장 + 반영**

반환 `approved`를 `data/staging/concept-security/_approved.json`에 Write 후:

Run: `node scripts/apply-batch.mjs concept-security data/staging/concept-security/_approved.json`
Expected: `concept-security: N → 45 (added M, skipped K)`.

- [ ] **Step 4: 전체 검증**

Run: `node -e "const d=require('./data/questions.json');const c=d.questions.filter(q=>q.domain==='concept-security');console.log('count',c.length);const ids=c.map(q=>q.id);console.log('unique ids',new Set(ids).size===ids.length);for(const q of c){const {validateQuestion}=await import('./scripts/cert-batch.lib.mjs');}" 2>&1 || npm test`
보강 검증:
Run: `npm test`
Expected: 전체 단위 테스트 PASS, concept-security count=45, id 중복 없음.

- [ ] **Step 5: 사후 샘플 점검**

새로 추가된 문제 중 5개를 무작위 Read로 확인 (자동 검수가 사람 검수를 대체하므로 1회 표본 점검). 명백한 오류 발견 시 해당 문제 status를 `needs-revision`으로 표시하거나 제거 후 보충 실행.

- [ ] **Step 6: Commit**

```bash
git add data/questions.json
git commit -m "feat: complete concept-security domain to 45 questions via cert-batch"
```

- [ ] **Step 7: 배포 확인**

Run: `git push`
Expected: Vercel 자동 빌드 트리거. (alias 갱신은 기존 워크플로대로 필요 시 수동.)

---

## Self-Review 결과

- **Spec coverage:** 실행방식(Workflow)=Task 10, args/준비=Task 7, 생성→검수 루프=Task 10, 재생성 피드백=Task 10(rejectFeedback), 루브릭 2기준=Task 9, 파일 반영(결정적, 메인루프)=Task 8, 타깃 소스 점검=Task 6+7, 리포트=Task 10 반환값+apply 로그, 재사용 파라미터화=Task 7/8/10(domain 인자). 비목표(재크롤·검수 UI)는 계획에서 제외 확인. ✔
- **Placeholder scan:** 모든 코드 스텝에 완전한 코드 포함. service-* 소스 후보 placeholder는 의도된 범위 밖 표시(주석 명시). ✔
- **Type consistency:** `validateQuestion`(Task2)→`appendQuestions`(Task5)에서 재사용, `ID_PREFIX`(Task4)→prepare/apply(Task7/8)에서 일관 사용, `selectSourcePaths`(Task6)→prepare(Task7), `VERDICT` 스키마(Task10)↔reviewer 출력(Task9) 일치. ✔
- **검수 기준:** 사용자 합의대로 "샘플 깊이 + 중복" 2가지로 좁힘 (Task9). ✔
