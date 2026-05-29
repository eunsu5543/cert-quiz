# 1.6단계 디자인 스펙 — 출처 기반 콘텐츠 시스템

작성일: 2026-05-29
컨텍스트: 1단계(`docs/.../2026-05-29-cert-quiz-stage1-design.md`) + 1.5단계(URL 변경, 홈/이전 버튼, AI agent 첫 사이클) 완료 후. 콘텐츠 출처의 신뢰성이 약한 점이 1.5단계 검토 중 명확히 드러남.

## 문제 인식

1. **기존 110문제 출처 불명확** — 단일 HTML에서 추출했으나 NHN 공식 사용자 가이드 기반인지, 어떤 페이지·섹션과 매핑되는지 추적되지 않음.
2. **Agent dispatch 결과도 추측 기반** — cert-explainer가 사용자 가이드 URL을 "참조하라" 지시받지만, 실제로는 LLM 내부 지식으로 추론. hallucination 위험.
3. **Glossary도 동일 문제** — Q1 v3에서 agent가 만든 glossary 3개는 LLM 추측이지 NHN 공식 정의 인용이 아님.
4. **시험 안내서 비율 미반영** — 본 프로젝트 6개 도메인이 공식 4개 도메인 비율(15/34/40/11)과 매핑되지 않아 시험 대비 효과 약함.

## 결정

- 기존 110문제 **폐기**(legacy로 보존만). 새로 **300문제 생성**.
- 출처: **NHN 사용자 가이드만**. 모든 문제·해설·glossary 항목에 source URL/path 박제.
- 챕터 = **시험 안내서 4개 공식 도메인**. 도메인별 문제 수는 공식 출제 비율에 비례.
- 유형: **단일선택형 (4지 1정답)** + **다중선택형 (5지 2+ 정답)**. 본 단계 default 비율 80:20 (시험 안내서엔 비율 명시 없음).
- 워크플로: **챕터별 batch 생성 → 사용자 검수 → approve → 다음 batch**. 인간-인-루프.

## 범위 (in scope)

- NHN 사용자 가이드 크롤링 → 로컬 마크다운 캐시 (`data/source/guide/`)
- NHN 용어사전 다운로드 → JSON 캐시 (`data/source/glossary.json`)
- 새 데이터 스키마 (v2) — 출처/유형/상태 필드 추가
- `question-generator` subagent 정의 — 도메인 + 가이드 청크 + batch size → 문제 N개
- Sample batch dispatch 1회 (개념/보안 도메인 5문제) — 워크플로 검증
- 기존 110문제 → `data/legacy/questions-v1.json`로 백업 후 제거

## Out of scope (1.7+)

- 검수 전용 UI 화면 (1.6엔 JSON 직접 검토)
- 자동 검증 (생성 ↔ 가이드 사실 일치 fact-check agent)
- 다중 에이전트 분리 (verifier, formatter 별도)
- 단일/다중 비율 동적 조정 (기본 80/20 고정)
- 검수 진행률 dashboard
- batch 자동 dispatch 큐 시스템

## 300문제 분포

| 도메인 | 비율 | 문제 수 | 단일(80%) | 다중(20%) |
|---|---|---|---|---|
| 클라우드 개념 및 보안 | 15% | 45 | 36 | 9 |
| NHN Cloud 서비스 특징 | 34% | 102 | 82 | 20 |
| NHN Cloud 서비스 활용 기술 | 40% | 120 | 96 | 24 |
| 결제 및 요금 | 11% | 33 | 26 | 7 |
| **합계** | 100% | **300** | 240 | 60 |

batch size: 도메인당 한 번에 10–25문제. 검수 부담 vs 작업 효율 균형.

## 데이터 흐름

```
NHN 사용자 가이드 (docs.nhncloud.com/ko/...)
         ↓  scripts/crawl-guide.mjs (Node + WebFetch)
data/source/guide/<service-id>/<page>.md   ← 로컬 마크다운 캐시

NHN 용어사전 (다운로드 또는 사용자 제공)
         ↓  scripts/build-glossary.mjs
data/source/glossary.json                   ← 캐시된 용어 정의

도메인 + 가이드 청크 + batch N
         ↓  Agent dispatch (question-generator)
data/staging/<domain>/batch-<NN>.json       ← draft 문제들
         ↓  사용자 검수 (JSON 직접 검토 또는 staging 파일 git diff)
         ↓  approve
data/questions.json  (v2 스키마, append-only)
```

## 데이터 스키마 v2

```jsonc
{
  "meta": {
    "id": "nhn-cloud-essentials",
    "name": "NHN Cloud Essentials",
    "version": "0.2.0",
    "targetCount": 300,
    "ratioSource": "official-exam-guide-v1"
  },
  "domains": {
    "concept-security":  { "name": "클라우드 개념 및 보안",     "ratio": 0.15, "target": 45  },
    "service-feature":   { "name": "NHN Cloud 서비스 특징",      "ratio": 0.34, "target": 102 },
    "service-skill":     { "name": "NHN Cloud 서비스 활용 기술", "ratio": 0.40, "target": 120 },
    "billing":           { "name": "결제 및 요금",                "ratio": 0.11, "target": 33  }
  },
  "questions": [
    {
      "id": "concept-001",                   // <domain-prefix>-<3digit>
      "domain": "concept-security",
      "type": "single",                       // "single" (4지) | "multi" (5지 2+)
      "q": "문제 본문",
      "options": ["A", "B", "C", "D"],         // 4 or 5
      "answer": [1],                           // 0-based
      "summary": "...",
      "perOption": [...],                      // length == options.length
      "glossary": [
        { "term": "용어(영문)", "definition": "공식 정의", "source": "glossary" }
      ],
      "source": [
        {
          "type": "user-guide",                 // "user-guide" | "exam-guide" | "sample-questions"
          "url": "https://docs.nhncloud.com/ko/.../page",
          "path": "data/source/guide/compute/instance.md",
          "section": "인스턴스 개념"
        }
      ],
      "status": "approved",                    // "draft" | "approved" | "rejected"
      "generatedAt": "2026-05-29T16:50:00Z",
      "reviewedAt": "2026-05-29T17:10:00Z"
    }
  ]
}
```

기존 v1 스키마(id: number, domain: 'compute'/'network'/...)는 호환 안 됨 — legacy 백업.

## Source 캐시 구조

```
data/
  questions.json              # v2 (새 출처 기반 데이터)
  source/
    guide/                    # 사용자 가이드 크롤 캐시
      compute/
        index.md
        instance.md
        ...
      network/
        ...
    glossary.json             # 용어사전 캐시
  staging/                    # 검수 대기 batch
    concept-security/
      batch-01.json
    ...
  legacy/
    questions-v1.json         # 기존 110문제 백업
```

## Agent 구조 (1.6단계 — 단일 에이전트 확장)

`.claude/agents/question-generator.md`:
- input: 도메인 ID, 가이드 청크들(또는 청크 경로들), batch size, 유형(`single`/`multi`/`mixed`)
- output: JSON 배열 — 각 element가 v2 스키마의 question 객체 (`status: "draft"`)
- 출처 모든 entry에 명시 (어느 청크에서 왔는지)

기존 `cert-explainer`는 1.6단계에서 사용 안 함 (110문제 폐기 결정 때문). 코드는 reference로 남김.

## 워크플로 (인간-인-루프, 한 batch 사이클)

1. 도메인 선택 (4개 중 하나, 미완성 우선)
2. 사용자가 또는 자동으로 가이드 청크 N개 선정 → agent에 전달
3. agent가 batch size만큼 문제 생성, 출처 명시, status: "draft"로 반환
4. `data/staging/<domain>/batch-<NN>.json`로 저장
5. 사용자 검수 — JSON 직접 검토. 오류는 수정, 폐기 가능
6. approved 문제들의 status: "approved", reviewedAt 기록 후 `data/questions.json`에 append
7. 도메인 progress 갱신 (X/target)

## Definition of Done (1.6단계)

- [ ] 사용자 가이드 핵심 페이지 (도메인 4개 분량 — 약 30–50 페이지) 로컬 마크다운 캐시 확보
- [ ] 용어사전 JSON 캐시 확보
- [ ] v2 스키마 데이터 모델 정의 + 기존 110문제 legacy 백업
- [ ] `question-generator` subagent 정의
- [ ] Sample batch (개념/보안 도메인 5문제) 생성 + 사용자 검수 완료 → `data/questions.json`에 첫 5문제 반영
- [ ] UI는 v2 스키마 호환 (도메인 id 변경, source 표시 영역 추가)

전체 300문제 batch 완주는 1.6단계 범위 밖. 1.7단계 또는 본인 비-세션 시간에 점진.

## 시간 박스 (오늘 16:30 → 18:00)

- 16:30 – 16:50: spec 작성
- 16:50 – 17:00: plan 작성
- 17:00 – 17:15: 용어사전 다운 + glossary.json
- 17:15 – 17:30: 사용자 가이드 크롤링 스크립트 작성 + 백그라운드 실행
- 17:30 – 17:45: question-generator agent md
- 17:45 – 18:00: sample batch 5문제 dispatch + 사용자 검수 시작

크롤링은 1.5h 안에 100% 끝나지 않을 수 있음. 다음 세션에 결과 확보.

## 리스크

- **사용자 가이드 크롤링 robots/rate limit**: docs.nhncloud.com이 자동 크롤링 막을 가능성. 대응: 정중한 rate (1초당 1요청), 차단 시 수동 fetch fallback.
- **용어사전 다운로드 URL 미확정**: 페이지에 명시적 다운 링크 없으면 사용자에게 파일 받기. 또는 페이지 자체를 fetch + 파싱.
- **단일/다중 비율 80:20 가정**: 시험 안내서엔 명시 없음. 실제 시험과 다르면 사용자가 spec 수정.
- **batch 검수 부담**: 한 도메인이 102문제(서비스특징)일 경우 검수 시간 큼. batch size 10–25로 쪼개 사이클 짧게.
