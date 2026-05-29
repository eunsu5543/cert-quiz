# 다음 세션 진입 메모 (2026-05-29 작성)

오늘 1.6단계 sample 5문제까지 검수 완료. 다음 세션 진입 시 아래 순서로 가면 자연스럽게 이어집니다.

## 현재 상태 스냅샷

- Live: https://cert-quiz-psi.vercel.app
- 데이터: v2 스키마, 5문제 (concept-security 도메인만, 40문제 더 필요)
- 도메인 진행률: concept 5/45, service-feature 0/102, service-skill 0/120, billing 0/33 (총 5/300)
- 가이드 캐시: `data/source/guide/` — 크롤 일부 완료 (Essentials 범위 외 페이지 포함, gitignored)
- 용어 사전: `data/source/glossary.json` — 341 terms (한/영 + 정의)
- Agent 정의: `.claude/agents/question-generator.md` — summary tone 보강됨 (오늘 v3 fix)
- 검수 워크플로: staging → user review → approved → questions.json

## 다음 세션 첫 작업 후보

### 옵션 1: 100문제 batch 본격 시작 (사용자가 가장 원했던 것)

도메인 비율로 분배:
- concept-security: 15문제 (5 이미 있음 → 10 더)
- service-feature: 34문제
- service-skill: 40문제
- billing: 11문제

batch size 5–10씩 dispatch → staging → 검수 → approved. 도메인 하나씩 끝내는 방식 권장.

**준비물 / 확인 사항:**
- 크롤링 캐시가 도메인별로 충분한지 점검 (`ls data/source/guide/ko/`)
- 부족하면 추가 페이지 fetch (시험 범위만 좁혀서)
- crawl-guide.mjs를 시험 범위 entry URLs만 받게 좁히는 게 효율적

### 옵션 2: 자동화 batch 스크립트 작성 + 사용자 비-세션 실행

`scripts/run-batch.mjs` — Anthropic SDK 직접 호출:
- 입력: 도메인 + batch size + 가이드 청크 경로들
- 출력: staging file에 결과 저장
- 본인 ANTHROPIC_API_KEY로 자기 시간에 N번 실행 가능

장점: Claude Code 세션 없이 본인이 자기 페이스로 batch 진행
단점: API 비용 본인 부담, 검수는 별개

### 옵션 3: 검수 UI 만들기

지금 staging JSON 직접 검토 → 별도 review 화면 (next.js 라우트 `/review`)에서:
- staging file 로드해서 문제 카드로 표시
- 각 문제에 approve / edit / reject 버튼
- approved JSON을 questions.json에 자동 append

장점: 검수 사이클 크게 단축, 폰에서도 검수 가능
단점: 작업량 큼 (4–6시간 추정)

## 우선순위 추천

1. **옵션 1** — 직접적 진행, 결과 빨리 보임
2. **옵션 3** — 검수 사이클이 진짜 병목이라 한 번 잘 만들어두면 효율 폭증
3. **옵션 2** — 1번에서 batch가 너무 많아진 후 고려

## 추가 정비 항목 (작업 중 발견)

- **크롤 범위 좁히기**: 현재 `crawl-guide.mjs`는 depth 2로 전체 사이트 크롤. Essentials 범위(Compute, Network, Storage, Database, NHN Cloud 기본 정책, Billing)만 cover하도록 entry URL 리스트 명시.
- **agent prompt에 glossary 활용 강화**: 현재 generator가 일부 문제에만 glossary 작성. `data/source/glossary.json` 의 341개 용어를 적극 인용하도록 instruction 보정.
- **단일/다중 비율 검증**: 현재 80/20 가정. 시험 후기 등으로 실제 비율 확인되면 수정.
- **출처 표시 UI**: 현재 question에 `source[]` 있지만 UI에서 표시 안 함. "출처: 사용자 가이드 X 섹션" 같이 작은 글씨로 표시 검토.

## 작업 디렉토리 컨텍스트

- main branch에서 작업 (feature branch 분리 없음, 단독 사이드 프로젝트)
- git push → Vercel 자동 deploy + alias 갱신은 수동 (`vercel alias set <new-deployment> cert-quiz-psi.vercel.app`)
- Vercel deployment protection: 비활성화됨 (사용자가 dashboard에서)

## 관련 문서

- 1.6 spec: `docs/superpowers/specs/2026-05-29-cert-content-sourcing-design.md`
- 1.6 plan: `docs/superpowers/plans/2026-05-29-cert-content-sourcing-plan.md`
- 시험 안내서: `docs/nhn-cloud-essentials-exam-guide.md`
- 공식 샘플 문제: `docs/nhn-cloud-essentials-sample-questions.md`
- Agent 정의: `.claude/agents/question-generator.md`, `.claude/agents/cert-explainer.md` (1.5 deprecated)
