# 1단계 디자인 스펙 — 자격증 학습 플랫폼: NHN Cloud 모의고사 마이그레이션

작성일: 2026-05-29
작성자: 사용자 + Claude (브레인스토밍)
타임박스: 2026-05-29 14:00 – 18:00 (4시간)

## 컨텍스트

자격증 학습 플랫폼의 시드 단계. 기존 단일 HTML 파일 `nhn-cloud-essentials-quiz.html` (약 300문제, 도메인별 카드 UI)을 Next.js로 마이그레이션하면서 사용자 학습 스타일(기출 해설 통독형)에 맞는 **모드 토글**을 한 가지 추가한다.

**오늘 18:00 기준 본인 iPhone 17 일반 기종의 Chrome 앱에서 동작 확인**이 1차 목표. (iOS의 Chrome은 Apple 정책상 WebKit 엔진을 사용하므로 렌더링은 Safari와 사실상 동일. UI/PWA 동작만 약간 다름.)

이후 PWA(2단계) → Spring Boot 백엔드 + **AWS 배포**(3단계, EC2/ECS/Lambda + RDS + S3) → 공유/피드백(4단계) → AI 해설 보강(5단계) → **App Store 등록**(Capacitor 패키징, +1단계)으로 확장 예정. 자세한 로드맵은 `MEMORY.md`의 `project-nhn-cert-quiz` 참고.

## 범위

### In scope (이번 차수)

- Next.js App Router 기반 단일 페이지 앱, `output: 'export'` 정적 export
- 기존 HTML/CSS UI 거의 1:1 React 이식 (스타일 토큰, 카드 디자인, 도메인 필터, 통계 화면)
- 데이터 분리: `data/questions.json` (DOMAINS + QUESTIONS 추출)
- 모드 토글: 풀이 모드(기본) ↔ 해설 모드, localStorage 영속화
- Vercel CLI 배포 + iPhone 17 일반 Chrome 앱 실기기 동작 확인 (safe-area inset, Dynamic Island 영역 처리 포함)

### Out of scope (다음 차수)

- 자격증 선택 홈 (현재 자격증 1개라 불필요)
- 자격증별 URL 라우팅 추상화
- `perOption` 등 풍부한 해설 스키마 (5단계 AI 보강 시)
- PWA (manifest, service worker) — 2단계
- 백엔드, 사용자 인증, 풀이 기록 — 3단계
- TypeScript strict, 자동화 테스트 — 폰 실기기 확인이 곧 테스트
- GitHub 연동, CI/CD — 추후 추가

## 핵심 결정 (브레인스토밍 합의)

| 항목 | 결정 | 근거 |
|---|---|---|
| 프론트엔드 스택 | Next.js (App Router) + JS | 사용자가 옵션 중 가장 익숙, 정적 export로 빠르게 |
| UX 모델 | 기존 카드 UI 유지 + 모드 토글 1개 | 학습 스타일(해설 통독)에 부합 |
| 데이터 모델 | 기존 `explain` 그대로, 새 필드 미도입 | 마이그레이션 비용 최소화 |
| 스타일링 | 기존 CSS 토큰 거의 그대로 | 디자인 만족 + 시간 절약 |
| 호스팅 | Vercel CLI 직접 배포 | 가장 빠른 경로, GitHub 우회 |
| 자격증 추상화 | 미도입 (1자격증 1페이지) | 두 번째 자격증 들어올 때 추가 |

## 모드 토글 사양 (1단계 유일한 신규 기능)

헤더 우측에 스위치 한 개. 상태는 `localStorage` 키 `quiz-mode` 에 저장 (`'solve'` | `'study'`). 디폴트는 `'solve'`.

### 풀이 모드 (`solve`, 기본)

기존 HTML 동작과 동일:
- 라디오/체크박스 선택 가능
- 액션바: "정답 확인" 버튼 → 누르면 정답 채점, 해설 표시, "다음 문제" 버튼으로 전환

### 해설 모드 (`study`)

카드 넘기듯 읽기:
- 카드 진입 시 정답이 미리 선택·강조된 상태로 표시
- 라디오는 disabled (조작 차단)
- 해설은 처음부터 펼친 상태
- 액션바: "다음 문제" 버튼만 표시 ("정답 확인" 단계 생략)

### 모드 토글 전환 시

- 현재 카드 인덱스는 유지
- 통계 진행도 유지
- 새로고침 후 마지막 모드 자동 복원

## 데이터 스키마

```jsonc
// data/questions.json
{
  "meta": {
    "id": "nhn-cloud-essentials",
    "name": "NHN Cloud Essentials"
  },
  "domains": {
    "compute":  { "name": "Compute",        "color": "#0064FF" },
    "network":  { "name": "Network",        "color": "#0ea5e9" },
    "storage":  { "name": "Storage",        "color": "#8b5cf6" },
    "database": { "name": "Database/Cache", "color": "#ec4899" },
    "org":      { "name": "조직/프로젝트",   "color": "#f59e0b" },
    "common":   { "name": "약관/공통",       "color": "#10b981" }
  },
  "questions": [
    {
      "id": 1,
      "domain": "compute",
      "type": "single",          // "single" | "multi"
      "q": "...",
      "options": ["A", "B", "C", "D"],
      "answer": [1],              // 정답 인덱스 배열 (0-based)
      "explain": "..."            // 기존 통합 해설
    }
    // ...
  ]
}
```

마이그레이션 절차: 기존 HTML의 `const DOMAINS = {...}` / `const QUESTIONS = [...]` 객체를 JSON으로 추출. 필드 변경 없음. 새 필드 추가 없음.

## 컴포넌트 구조

```
app/
  layout.js              # 글로벌 CSS import, 헤더(모드 토글 포함)
  page.js                # 메인 페이지 — 도메인 필터 → 카드 풀이/통계 흐름
components/
  ModeToggle.js          # 헤더 스위치, localStorage 영속화
  DomainFilter.js        # 도메인별 칩 + 필터 토글
  QuestionCard.js        # 단일 문제 카드 (풀이/해설 모드 모두 처리)
  ActionBar.js           # 하단 고정 액션 바 (모드별 버튼 분기)
  StatsScreen.js         # 종료 후 점수 + 도메인별 통계
  ProgressBar.js         # 상단 진행도
contexts/
  ModeContext.js         # 모드 상태 공유 (Context API 1개)
data/
  questions.json
public/
  (favicon 등 정적 자산)
styles/
  globals.css            # 기존 :root 토큰 + 컴포넌트 클래스
```

상태 관리: `useState` / `useReducer` + Context API 1개 (모드 공유). 외부 상태 라이브러리 없음.

## 라우팅

- `/` — 메인 페이지. 도메인 필터 → 문제 풀이/해설 → 통계 흐름.

자격증 선택 라우팅은 두 번째 자격증 들어올 때 도입.

## 배포 절차

1. `npm i -g vercel` (CLI 글로벌 설치)
2. `vercel login` (GitHub/Google 원클릭)
3. 프로젝트 루트에서 `vercel --prod`
4. 발급된 `https://*.vercel.app` URL을 사용자 폰으로 (카톡 나에게 보내기 또는 메모)
5. iPhone 17 일반 Chrome 앱에서 동작 확인

GitHub 연동/CI는 1단계 종료 후 추가.

## Definition of Done (오늘 18:00)

- [ ] iPhone 17 일반 기종 Chrome 앱에서 Vercel URL을 열어 NHN Cloud 모의고사가 정상 동작
- [ ] 도메인 필터, 풀이, 채점, 해설 표시 등 기존 기능 모두 정상
- [ ] 헤더 토글로 풀이 모드 / 해설 모드 전환 가능, 새로고침 후 마지막 모드 유지
- [ ] 폰 화면 레이아웃 깨짐 없음 (safe-area inset + Dynamic Island 영역)
- [ ] 통계 화면 정상 표시 및 "다시 시작" 동작
- [ ] 300문제 모두 마이그레이션 (누락 없음)

## 환경 / 의존성

확인됨:
- Node v24.14.1, npm 11.11.0, Git 2.53

추가 필요:
- Vercel CLI 글로벌 설치 (`npm i -g vercel`)
- Vercel 계정 (브레인스토밍 시점 사용자 가입 진행 중)

## 4시간 타임박스 계획

| 시간 | 작업 |
|---|---|
| 14:00 – 14:30 | spec 정리, 환경 셋업, Next.js 프로젝트 생성 |
| 14:30 – 15:30 | 기존 HTML/CSS → React 컴포넌트 1차 이식 |
| 15:30 – 16:30 | 데이터 JSON 분리 + 모드 토글 + 로컬 모바일 사이즈 확인 |
| 16:30 – 17:30 | Vercel 배포 + 폰 실기기 검증 + 버그 수정 |
| 17:30 – 18:00 | 여유분 (예측 못한 이슈, 마무리) |

## 리스크

- **iOS WebKit 호환성**: iPhone Chrome도 내부 엔진은 WebKit이므로 Safari와 호환 이슈는 동일. 기존 HTML이 이미 iOS 친화적이라 큰 리스크 없음. 단 Next.js 정적 export 시 viewport meta·safe-area 토큰 유지 점검 필요.
- **iPhone 17 Dynamic Island**: 상단 safe-area-inset-top 값이 기존 노치 기종보다 클 수 있음. `env(safe-area-inset-top)` 그대로 사용하면 자동 처리되나, 실기기 확인 필수.
- **시간 초과**: 17:30 시점에 폰 동작 미확인이면 모드 토글 미완성이어도 마이그레이션 + 배포만 우선 마무리 (모드 토글 없이도 기존 기능 그대로면 1차 결과물로 인정).
- **벤더 락인**: 1단계 Vercel 의존. 정적 export 사용해서 추후 AWS로 이전 가능한 형태로 유지.

## 다음 차수 (참고)

- 1.5단계: 자격증 선택 홈, 두 번째 자격증 JSON 추가, 라우팅 추상화
- 2단계: PWA (manifest, service worker), 커스텀 도메인
- 3단계: Spring Boot 백엔드 + **AWS 배포** (EC2/ECS 또는 Lambda + RDS + S3), Google OAuth, 풀이 기록
- 4단계: 공유/피드백 루프
- 5단계: AI 해설 보강 (Claude API)
- **+1단계**: Capacitor 패키징 → **iOS App Store 등록** (Apple Developer $99/년 필요)
