# 1.6단계 구현 플랜 — 출처 기반 콘텐츠 시스템

> **For agentic workers:** Use superpowers:executing-plans or subagent-driven-development. Steps use `- [ ]` checkbox syntax.

**Goal:** NHN 사용자 가이드 + 용어사전을 진짜 출처로 둔 콘텐츠 생성 워크플로 구축. Sample batch 5문제 검수 완료까지가 1.6단계 목표.

**Architecture:** 사용자 가이드 로컬 크롤링(마크다운 캐시) + 용어사전 JSON 캐시 + 단일 `question-generator` agent + 인간-인-루프 batch 검수 + v2 데이터 스키마(출처 추적).

**Tech Stack:** Node.js (ESM) + WebFetch + 기존 Next.js/React stack 그대로

**Timebox:** 2026-05-29 16:50–18:00 (1시간 10분). 크롤링은 background로 완주 가능.

---

## File Structure

To create:
- `data/source/glossary.json` — 용어사전 캐시
- `data/source/guide/<service>/*.md` — 사용자 가이드 크롤 캐시 (background, 시간 길게)
- `data/staging/concept-security/batch-01.json` — sample batch 결과
- `data/legacy/questions-v1.json` — 기존 110문제 백업
- `scripts/build-glossary.mjs` — 용어사전 다운/변환
- `scripts/crawl-guide.mjs` — 사용자 가이드 크롤러
- `scripts/migrate-to-v2.mjs` — 기존 v1 → v2 스키마 변환 (또는 단순 백업)
- `.claude/agents/question-generator.md` — 새 subagent
- `data/questions.json` — v2 스키마로 재초기화

To modify:
- `components/Quiz.js`, `components/QuestionCard.js`, `components/DomainFilter.js`, `components/StatsScreen.js` — v2 도메인 id 변경(`compute`→`concept-security` 등), source 표시 영역

---

### Task A: 기존 데이터 백업 + v2 스키마 초기화

- [ ] **A.1** `mkdir data/legacy && cp data/questions.json data/legacy/questions-v1.json`
- [ ] **A.2** `data/questions.json`을 v2 스키마로 재초기화 (questions: 빈 배열, domains: 4개 공식 도메인)
- [ ] **A.3** UI 컴포넌트 — 도메인 매핑 변경 (concept-security, service-feature, service-skill, billing). 폰에서 빈 도메인 표시 깨지지 않는지 확인.
- [ ] **A.4** Commit: `refactor: migrate to v2 schema with official 4-domain split, backup v1`

---

### Task B: 용어사전 다운로드 + JSON 변환

- [ ] **B.1** NHN glossary 페이지(`https://www.nhncloud.com/kr/resource/glossary`) WebFetch로 받아 다운 링크 확인. 엑셀 다운 링크 있으면 그걸 fetch.
- [ ] **B.2** 엑셀 다운 안 되면 사용자에게 파일 요청 (`사용자에게: glossary 엑셀 파일 경로 알려주거나 첨부 부탁`).
- [ ] **B.3** `scripts/build-glossary.mjs` — 엑셀(xlsx) 파싱 → `data/source/glossary.json`
  - 출력 스키마: `[{ "term_ko": "...", "term_en": "...", "def_ko": "...", "def_en": "..." }]`
- [ ] **B.4** sanity check: 항목 수 출력, 첫 3개 항목 sample
- [ ] **B.5** Commit: `feat: cache NHN official glossary as JSON`

---

### Task C: 사용자 가이드 크롤링 스크립트

- [ ] **C.1** `scripts/crawl-guide.mjs` — 시작 URL `https://docs.nhncloud.com/ko/nhncloud/ko/overview/`
  - WebFetch + 정규식으로 내부 링크 추출
  - `data/source/guide/<path>.md`로 저장 (URL path 그대로)
  - rate limit: 1초당 1요청 (정중 크롤)
  - 이미 받은 페이지는 skip (resumable)
  - HTML → 마크다운 변환은 가장 단순한 형태 (제목/본문/리스트만)
- [ ] **C.2** Background 실행 — 30분~수 시간. 다음 세션에 결과 확인 OK.
- [ ] **C.3** 가능한 만큼 진행되면 commit: `feat: NHN user guide local cache (partial crawl)`

---

### Task D: question-generator subagent

- [ ] **D.1** `.claude/agents/question-generator.md` 작성
  - frontmatter: name, description, tools (Read, Glob, Grep, WebFetch), model: sonnet
  - body: input(도메인+가이드 청크+batch size+유형), output(v2 question 배열), 톤·출처 기준, sample 톤(공식 샘플 8개 참조)
- [ ] **D.2** Commit: `feat: question-generator subagent for sourced content generation`

---

### Task E: Sample batch dispatch + 검수

- [ ] **E.1** 개념/보안 도메인 관련 가이드 청크 1–3개 골라 agent에 전달 (e.g., 책임 공유 모델, 클라우드 컴퓨팅 개념). 크롤링 결과 부족하면 `docs/nhn-cloud-essentials-sample-questions.md`의 1, 2번 샘플과 그 주변 가이드 페이지 1–2개 fetch.
- [ ] **E.2** batch size 5 (단일 4 + 다중 1) 요청
- [ ] **E.3** 결과를 `data/staging/concept-security/batch-01.json`에 저장
- [ ] **E.4** 사용자 검수 — 각 문제 검토. 사용자가 OK/수정/reject 표시
- [ ] **E.5** approve된 문제들 status: "approved" + `data/questions.json`에 append
- [ ] **E.6** 폰에서 새 문제 표시 확인 (Vercel auto-deploy 후)
- [ ] **E.7** Commit: `feat: first 5 sourced questions in concept-security domain`

---

## Definition of Done

- [ ] v2 스키마 데이터 모델 작동 (UI가 빈/일부 도메인 그대로 렌더)
- [ ] 용어사전 JSON 캐시 확보 (B 완료)
- [ ] 사용자 가이드 크롤링 시작 (C 진행 중 또는 완료)
- [ ] question-generator agent 정의 + 적어도 1회 dispatch 성공
- [ ] 5문제 sample이 `data/questions.json`에 들어가서 폰에서 표시 가능

## Self-Review

- **Spec coverage:** ✅ 모든 in-scope 항목이 Task로 매핑됨.
- **Placeholder scan:** ✅ 모든 step에 구체 명령/파일 경로.
- **Type consistency:** ✅ v2 스키마 문서·코드 일치.
- **Scope check:** 1.5h 안에 D, E 진입 빡빡. 가능하면 진행, 시간 부족 시 D까지로 끊고 E는 다음 세션.

## 리스크 & 대응

- **크롤링 차단**: docs.nhncloud.com이 자동 크롤 막을 가능성. 대응: 차단 시 핵심 페이지 수동 fetch fallback (사용자에게 URL 리스트 받기).
- **glossary 엑셀 다운 못 함**: WebFetch로 페이지 받아 HTML 파싱 시도. 안 되면 사용자에게 파일 부탁.
- **시간 초과**: E까지 못 가면 D 완료 + sample dispatch 1회 시도까지가 마무리. 검수는 다음 세션.
