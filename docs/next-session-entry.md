# 다음 세션 진입 메모 (2026-06-02 갱신 — 파이프라인 안정화 + service-feature 마감 + billing 착수)

## 한 줄 요약

자동화 파이프라인을 **안정화**(JSON parse 실패 0 + answer 오답키 가드레일)하고, **service-feature 0→98**(실질 완료), **billing 0→10**(검증 배치)까지 진행. 총 **137문제**. 전수 answer/perOption 정합성·무결성 통과.

## 현재 상태 스냅샷

- Live: https://cert-quiz-psi.vercel.app (자동배포)
- 최신 커밋: `20f56f8` push 완료
- 데이터: **총 137문제**, 전부 v2 스키마 valid, answer↔perOption 불일치 0(전수)
- 도메인 진행률:
  - **concept-security: 29 / 30** (사실상 완료)
  - **service-feature: 98 / 102** (실질 완료 — 96%. 마지막 4개는 ROI 낮아 보류)
  - **billing: 10 / 33** (검증 배치 완료. 소스 얇아 천장 ~15-20 예상)
  - **service-skill: 0 / 120** ← **다음 큰 작업. 소스 선별 필요(현재 placeholder 1개)**
- ⚠️ `meta.targetCount`=300 vs 도메인 target 합=285. 미해결. service-feature가 98에서 멈추면 실질 합은 더 내려감 → 재배분 결정 필요.

## ▶ 다음 세션 첫 작업 후보

1. **service-skill(0/120) 착수** — 가장 큰 도메인(40%). `cert-batch.lib.mjs`의 `DOMAIN_SOURCE_CANDIDATES['service-skill']`이 placeholder 1개뿐 → **소스 선별 필수**. service-feature 때처럼 각 서비스의 console-guide/user-guide(콘솔 조작·API 활용 = "스킬") 중심으로 선별. 여러 배치 필요.
2. **billing 잔여 채우기** — 10→천장(~15-20). 한 배치 더 돌려 자연 천장 확인. 소스 얇음 유의.
3. **`meta.targetCount` 정리** — 285 인정 vs 300 유지+재배분. service-feature 98 확정 시 반영.

## 자동화 파이프라인 (안정화 완료)

설계/계획: `docs/superpowers/specs|plans/2026-06-01-cert-batch-automation.*`

| 구성요소 | 역할 |
|---|---|
| `scripts/cert-batch.lib.mjs` | 순수 로직. **validateQuestion에 answer↔perOption 정합성 하드 게이트 추가**, **reconcileAnswer**(perOption 기준 answer 자동교정) 추가. `npm test` 34개 통과 |
| `scripts/prepare-batch.mjs` | `node scripts/prepare-batch.mjs <domain>` → `_batch-args.json` 생성(avoidList 자동) |
| `scripts/apply-batch.mjs` | `node scripts/apply-batch.mjs <domain> <approvedJsonPath>` → 검증·append |
| `.claude/agents/question-generator.md` | 생성기. **구조화 출력(schema)로 전환** + 0-인덱스 규칙 명시 |
| `.claude/agents/question-reviewer.md` | 검수기. **기준0(정답 정합성) 추가** |
| `.claude/workflows/cert-batch.js` | 생성→검수 루프. **생성기 agent에 schema:BATCH** + 검수 전 reconcileAnswer |

### 이번 세션의 핵심 수정 (재발 방지)

1. **JSON parse 실패 제거**(`bbf838a`): 생성기 agent() 호출에 schema 없어 raw 텍스트를 JSON.parse → 펜스/서두 오염으로 라운드 다수 실패. `schema:BATCH` 적용으로 0건화.
2. **answer 오답키 가드레일**(`03a905e`): 생성기가 answer를 1-인덱스로 출력하는 버그(structurally valid·semantically wrong, 검수기·validateQuestion 모두 못 잡음). 다층 방어: validateQuestion 하드 게이트 + reconcileAnswer 자동교정(perOption=정답키) + 워크플로 교정 + 프롬프트 0-인덱스 + 검수기 기준0. **출하된 데이터는 검사 결과 불일치 0(무사).**

## 배치 실행 절차 (도메인 1개 채우기)

1. (소스 미설정 도메인) `selectSourcePaths`의 해당 도메인 후보에 시험범위 소스 추가
2. `node scripts/prepare-batch.mjs <domain>` → args 생성 (avoidList 자동 반영)
3. **Workflow 실행**: `Workflow({scriptPath:"C:/Docs/cert-quiz/.claude/workflows/cert-batch.js", args:<args객체, need 조정, baseDir 포함>})`
   - 명명 워크플로 레지스트리엔 없음 → scriptPath 사용
   - args의 avoidList는 `_batch-args.json`에서 복사. need는 검증 배치면 12, 본배치면 30 권장
4. 완료 후 출력 파일(`%TEMP%/.../tasks/<id>.output`) 읽어 표본점검:
   - 로그: parse 실패/answer 자동교정/dry streak 확인
   - **answer↔perOption 정합성**(reconcileAnswer/validateQuestion 기계 대조) + 트리비아 제외 + 중복(내부·기존)
5. 통과분만 `_approved.json` 저장(reconcileAnswer 적용) → `node scripts/apply-batch.mjs <domain> ...`
6. `npm test` + 무결성(total/domains/dup/tmp/answer불일치 0) → commit → push

## 핵심 교훈 — 도메인별 출제 천장 + 소스 확장

- **overview만으론 천장 낮음**: service-feature가 overview 28개로 72에서 트리비아 양산(제외율 23%). **개념·기능 페이지 11개 추가**(`4d544ca`: RDS db-instance/engine/backup, Object Storage acl/policy, CF trigger, NKS/NCR user-guide 등)로 98까지 정당하게 상향(제외율 13%로 개선). 시험범위=사용자 가이드 전체(안내서 line29), Quickstarts만 제외.
- **트리비아 신호**: NCR 내부용어(레지스트리/이미지/아티팩트/태그)가 6회 재등장 — 이런 내부 용어 정의는 입문 범위 밖. 콘솔 클릭 단계·설정 글자수·카드 검증 금액 등도 제외 대상.
- **품질 > 목표수**: concept-security 29/30, service-feature 98/102처럼 소프트 상한까지 뽑고 멈추는 게 옳음. 강제 충원 = 트리비아.

## 관련 문서

- 시험 안내서: `docs/nhn-cloud-essentials-exam-guide.md` (도메인 범위·비율·출제원 기준)
- 공식 샘플: `docs/nhn-cloud-essentials-sample-questions.md` (난이도 기준선)
- spec/plan: `docs/superpowers/specs|plans/2026-06-01-cert-batch-automation.*`
