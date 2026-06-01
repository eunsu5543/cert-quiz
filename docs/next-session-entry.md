# 다음 세션 진입 메모 (2026-06-01 갱신 — service-feature 착수 직전)

1.7단계: 문제 생성→에이전트 검수→`data/questions.json` 자동 반영 파이프라인 구축 완료, concept-security 마감.
**이번 세션**: 워킹트리 정리 + service-feature 소스 28개 확장 + 배치 args 준비까지 완료. 워크플로 실행 직전에서 세션 종료.

## ▶ 다음 세션 첫 작업 (여기부터 시작)

service-feature 워크플로 실행 준비가 **모두 끝나 있음**. 남은 결정 하나: **need 값**(=이번 실행에서 뽑을 문제 수).
- 사용자에게 물었으나 미응답(세션 종료). **권장: 검증 배치 need=12 먼저** → 새 28개 소스로 나온 품질 표본점검 후 전량 확장.
- `data/staging/service-feature/_batch-args.json` 은 이미 생성돼 있음(need=102로 박혀있으니 **실행 시 args에서 need만 12로 덮어쓸 것**).

실행 명령 (need=12 검증 배치 예시):
```
Workflow({ scriptPath: "C:/Docs/cert-quiz/.claude/workflows/cert-batch.js",
           args: { ...(_batch-args.json 내용), need: 12, baseDir: "C:/Docs/cert-quiz" } })
```
반환 `approved` → `data/staging/service-feature/_approved.json` 저장 → 표본점검 → `node scripts/apply-batch.mjs service-feature data/staging/service-feature/_approved.json` → `npm test` → commit → push.

⚠️ 워크플로 규모 주의: need=102 전량이면 ~21라운드 × (생성1+검수8) ≈ 서브에이전트 150개+ 토큰 대량. 그래서 검증 배치 먼저 권장.

## 현재 상태 스냅샷

- Live: https://cert-quiz-psi.vercel.app
- 최신 커밋: 이번 세션 커밋(아래) push 완료, Vercel 자동배포됨
- 데이터: 총 29문제, 전부 concept-security 도메인, 전부 v2 스키마 valid (service-feature는 아직 0 — 워크플로 미실행)
- 도메인 진행률:
  - **concept-security: 29 / 30** (target 45→30 하향, 사실상 완료. need=1)
  - service-feature: 0 / 102 ← **다음 작업. 소스·args 준비 완료, 워크플로만 돌리면 됨**
  - service-skill: 0 / 120
  - billing: 0 / 33
- ⚠️ `meta.targetCount`=300인데 도메인 target 합=285 (concept 하향 탓). 미해결 결정: 285로 인정 vs 300 유지+15개 재분배.

## 이번 세션에 한 것

1. **워킹트리 정리**: 버려지는 staging/임시 산출물 6개 삭제, `.gitignore`에 `_` 접두사 컨벤션 규칙 추가(`data/staging/_*`, `data/staging/**/_*`, `.tmp-*`). 추적 중인 실제 배치(`batch-02-v2.json`)는 유지. 커밋 `4b494f9`.
2. **service-feature 소스 확장**: `cert-batch.lib.mjs`의 `DOMAIN_SOURCE_CANDIDATES['service-feature']`를 placeholder 1개 → 핵심 IaaS overview 28개로 확장(Compute 6 / Network 10 / Storage 4 / Database 4 / Container 3 + nhncloud/overview). 입문 시험 범위 밖 니치 상품(Traffic Mirroring, Webshell Detector, Notification 하위상품 등)은 의도적 제외 — 필요시 2차 확장. 28/28 경로 존재 확인, `npm test` 26개 통과.
3. `node scripts/prepare-batch.mjs service-feature` 실행 → `_batch-args.json` 생성 완료(gitignore라 미추적, 재생성 가능).

## 자동화 파이프라인 (완성·검증됨)

설계/계획: `docs/superpowers/specs/2026-06-01-cert-batch-automation-design.md`, `docs/superpowers/plans/2026-06-01-cert-batch-automation.md`

| 구성요소 | 역할 |
|---|---|
| `scripts/cert-batch.lib.mjs` | 순수 로직(검증·avoidList·ID재부여·append·소스선별). `npm test` 26개 통과 |
| `scripts/prepare-batch.mjs` | `node scripts/prepare-batch.mjs <domain>` → `data/staging/<domain>/_batch-args.json` 생성 |
| `scripts/apply-batch.mjs` | `node scripts/apply-batch.mjs <domain> <approvedJsonPath>` → questions.json에 검증·append |
| `.claude/agents/question-generator.md` | 생성 에이전트(기존) |
| `.claude/agents/question-reviewer.md` | 검수 에이전트(신규). 루브릭: ①공식 샘플 깊이 정합 ②중복. 인증키·설정값 트리비아 reject |
| `.claude/workflows/cert-batch.js` | 생성→검수 루프 Workflow. 소프트상한(3회 dry시 조기종료) |

### 실행 절차 (도메인 1개 채우기)

1. `selectSourcePaths`(lib)의 해당 도메인 후보에 시험범위 소스 경로 추가 (service-*/billing은 현재 placeholder 1개뿐 → 확장 필수)
2. `node scripts/prepare-batch.mjs <domain>` → args 파일 생성
3. **Workflow 실행** (중요 교훈):
   - 명명 워크플로 레지스트리엔 없음 → `Workflow({scriptPath: "C:/Docs/cert-quiz/.claude/workflows/cert-batch.js", args: <args객체>})`
   - args는 문자열로 전달됨 → 워크플로가 내부에서 JSON.parse 처리(이미 반영됨)
   - 세션 cwd가 `C:/Docs`(프로젝트 부모)라 워크플로 서브에이전트가 프로젝트 `.claude/agents`를 모름 → `agentType` 안 쓰고 기본 서브에이전트가 정의파일을 절대경로로 Read, 소스도 baseDir로 절대화(이미 반영됨). args에 `baseDir: "C:/Docs/cert-quiz"` 포함시킬 것
   - args의 avoidList는 `_batch-args.json`에서 그대로 복사
4. 반환된 `approved` 배열을 `data/staging/<domain>/_approved.json`에 저장
5. (필요시) 품질 표본점검 후 부적합 문제 제외
6. `node scripts/apply-batch.mjs <domain> data/staging/<domain>/_approved.json`
7. `npm test` + 검증(count/유니크/invalid 0) → commit → `git push`

## 핵심 교훈 — 도메인별 출제 천장

concept-security가 45→29에서 멈춘 건 **공식 범위 한계**(재크롤로 안 풀림). 시험안내서상 concept-security = "클라우드 컴퓨팅 개념·특징, 책임공유 모델, 일반적인 클라우드 보안 개념" = 일반 개념 수준. NHN 사용자 가이드는 제품 문서라 순수 일반개념 콘텐츠가 얕음 → ~29~30이 실질 천장. **품질·범위 지키며 소프트상한까지 뽑고 멈추는** 방식이 옳음(45 강제 충원 = 트리비아 유발).

→ **service-feature/service-skill/billing은 제품 가이드가 풍부**해 천장이 훨씬 높을 것. 파이프라인이 제 성능을 낼 도메인들.

## 다음 세션 첫 작업 후보

1. `meta.targetCount` 정리 (285 인정 vs 300 재분배) — 사용자 결정 필요
2. **service-feature(102) 시작** — `selectSourcePaths['service-feature']`에 각 서비스 overview/console-guide(시험범위) 추가 → prepare→workflow→apply 반복. 도메인 비율 큼(34%)이라 batch 여러 번 필요
3. service-skill(120) 전: 깊이 재크롤은 선택(콘텐츠 대부분 단일 장문 페이지라 필수 아님)

## 관련 문서

- spec/plan: `docs/superpowers/specs|plans/2026-06-01-cert-batch-automation.*`
- 시험 안내서: `docs/nhn-cloud-essentials-exam-guide.md` (도메인 범위·비율 기준)
- 공식 샘플: `docs/nhn-cloud-essentials-sample-questions.md` (난이도 기준선)
