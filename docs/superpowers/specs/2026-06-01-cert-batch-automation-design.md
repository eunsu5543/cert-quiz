# 설계: 문제 생성·검수·반영 자동화 워크플로 (cert-batch)

작성일: 2026-06-01
대상: cert-quiz 1.7단계 — 도메인별 문제 batch 자동 생성

## 목표

문제 생성 → 검수 → `data/questions.json` 반영까지 **사람 개입 0**으로 자동화한다.
사용자는 검수하지 않고, 통과한 문제가 파일에 바로 누적된다.

- 이번 실행 타깃: `concept-security` 도메인을 45개 목표까지 완성 (현재 10 → +35)
- 재사용 가능하게 파라미터화: 다음에 `billing`, `service-feature`, `service-skill`도 동일 워크플로로 실행

## 실행 방식

Claude Code **Workflow**로 오케스트레이션한다 (독립 Node 스크립트 아님).

- 기존 `.claude/agents/question-generator.md`(sonnet)를 그대로 `agentType`로 사용
- 신규 `.claude/agents/question-reviewer.md`를 검수 에이전트로 추가
- 별도 API 키·비용 세팅 불필요, 검수 탈락 시 자동 재생성 루프가 자연스러움

## 입력 (args)

```jsonc
{
  "domain": "concept-security",   // 4개 도메인 중 하나
  "target": 45,                   // 해당 도메인 최종 목표 개수
  "batchSize": 8                  // 한 라운드 생성 개수 (기본 8)
}
```

## 파이프라인

### 0. 준비 (스크립트 내 인라인 / prep 에이전트)

1. `data/questions.json` 로드 → 해당 도메인 기존 approved 문제의 `q` 본문·토픽을 추출해 **중복 회피 리스트** 구성. 현재 개수 `have` 산정 → 생성 필요 수 `need = target - have`.
2. **타깃 소스 점검**: 해당 도메인이 인용할 핵심 가이드 파일이 `data/source/guide/` 에 실재하는지 prep 에이전트가 매핑·확인. 시험 범위 외(Quickstarts 등)는 제외. 결과를 `sourcePaths`로 확정.
   - concept-security 핵심 후보: `ko/nhncloud/ko/overview.md`, `security-policy.md`, `resource-policy.md`, `region-guide.md`, Network/Security/Management 카테고리의 overview·console-guide 일부.

### 1. 생성 → 검수 루프

`approved` 누적이 `need`에 도달할 때까지 (안전 상한: `maxRounds`) 반복:

1. **생성** — `question-generator` 에이전트에 `{domain, domainName, batchSize, typeMix, sourcePaths, glossaryPath, idStart, avoidList}` 전달 → v2 스키마 문제 배열 반환 (status:"draft").
   - `avoidList` = 기존 approved 문제 + 이번 실행 누적 approved 문제의 `q` 본문/토픽. 중복 생성 방지.
2. **검수** — 생성된 각 문제를 `question-reviewer` 에이전트가 채점 → `{ verdict: "pass"|"reject", reasons: [...] }`.
   - **검수 루브릭 (좁힘):**
     1. **난이도 정합** — 공식 샘플 8문제(`docs/nhn-cloud-essentials-sample-questions.md`) 깊이와 동일한 출제 차원인가. 외울거리(숫자·명명규칙·순서값·세부설정값)·문서 내부 식별자(시나리오 번호) 의존 → reject.
     2. **중복 아님** — `avoidList` 및 이번 라운드 통과분과 근접 중복(같은 토픽·같은 정답 포인트)이면 reject.
   - (스키마 유효성·출처 존재 등 기계적 체크는 스크립트단에서 가볍게 병행 가능하나, 핵심 판정 기준은 위 2가지.)
3. **통과** → 누적. **탈락** → 탈락 사유를 다음 생성 라운드 프롬프트에 피드백 (재생성 루프).
4. 같은 취지 문제가 연속 탈락하거나 라운드 상한 도달 시 중단하고 현재까지 통과분으로 마감 (`log`로 부족분 명시 — 무음 절단 금지).

워크플로는 **검증된 문제 셋(데이터)을 반환만** 한다. 파일을 에이전트가 직접 수정하지 않는다 (동시성·손상 방지).

### 2. 파일 반영 (워크플로 종료 후 메인 루프가 결정적으로 수행)

1. 통과 문제에 ID 재부여 (`concept-011` … 순차), `status:"approved"`, `generatedAt` 유지.
2. `data/questions.json` 의 `questions[]`에 append. 필요 시 `meta` 갱신.
3. 사용자 검수 없이 자동 반영.

### 3. 리포트

- 요약: 생성 N / 통과 M / 탈락 사유 분포 / 도메인 최종 개수 (`have → new total`).
- 원하면 git commit (`feat: <domain> +M questions via auto batch`).

## 산출물

| 파일 | 내용 |
|---|---|
| `.claude/agents/question-reviewer.md` | 신규 검수 에이전트 정의 (루브릭: 샘플 깊이 정합 + 중복 체크) |
| 워크플로 스크립트 `cert-batch` | 생성→검수→반환 오케스트레이션 (재사용, args 파라미터화) |
| `data/questions.json` | 통과 문제 누적 (실행 결과물) |

## 비목표 (이번 범위 밖)

- 깊이 재크롤 / 시험 범위 entry URL로 크롤러 좁히기 → `service-skill` 차례 전에 별도 처리.
- 검수 UI, 독립 Node batch 스크립트(run-batch.mjs) → 채택 안 함.
- 출처 표시 UI, PWA 등 후속 단계.

## 알려진 제약

- 가이드 캐시는 `MAX_DEPTH=2` 크롤 + 재개 버그(`crawl-guide.mjs:49-53`)로 **완전성 미보증**. 단 각 가이드가 단일 장문 페이지(console-guide ~85KB)라 본문은 통으로 캡처됨. concept-security는 얕은 개념·정책 페이지 위주라 이번 실행에 충분.
- 자동 검수는 사람 검수를 대체하므로, 루브릭 품질이 곧 결과 품질. 첫 실행 후 통과 문제 일부를 사후 샘플 점검 권장.
