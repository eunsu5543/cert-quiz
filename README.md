# cert-quiz

자격증 학습 플랫폼. NHN Cloud Essentials 모의고사를 시드로, 향후 AWS·CKA 등 여러 자격증으로 확장 예정.

🌐 **Live**: https://cert-quiz-psi.vercel.app

## 특징

- **풀이 모드 / 해설 모드 토글** — 풀이 모드는 정답 확인 후 해설, 해설 모드는 정답·해설이 처음부터 펼쳐져 카드 넘기듯 읽기
- **홈 / 이전 문제 / 도메인 필터** — 학습 사이클을 본인 페이스로 조정
- **문제별 출처 추적** — 모든 문제·해설이 NHN 공식 사용자 가이드 인용 (v2 스키마부터)
- **보기별 분석 + 관련 용어** — 정답·오답 보기마다 근거 분석, NHN 공식 용어 사전 인용
- **모바일 친화** — iOS safe-area inset, iPhone Dynamic Island 영역 처리
- **정적 사이트** — Next.js `output: 'export'`로 Vercel 배포, GitHub push 시 자동 빌드

## 기술 스택

- Next.js 14 (App Router, JS)
- React 18
- Vercel (호스팅 + 자동 CI/CD)
- Anthropic Claude (콘텐츠 생성 subagent)

## 로컬 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 정적 export → out/
```

## 데이터 구조 (v2 schema)

```jsonc
{
  "meta": { "id": "...", "name": "...", "version": "0.2.0", "targetCount": 300 },
  "domains": {
    "concept-security":  { "name": "클라우드 개념 및 보안", "ratio": 0.15, "target": 45 },
    "service-feature":   { "name": "NHN Cloud 서비스 특징", "ratio": 0.34, "target": 102 },
    "service-skill":     { "name": "NHN Cloud 서비스 활용 기술", "ratio": 0.40, "target": 120 },
    "billing":           { "name": "결제 및 요금", "ratio": 0.11, "target": 33 }
  },
  "questions": [
    {
      "id": "concept-001",
      "domain": "concept-security",
      "type": "single",                 // "single" (4지 1정답) | "multi" (5지 2+정답)
      "q": "...", "options": [...], "answer": [1],
      "summary": "문제가 묻는 토픽",
      "perOption": ["정답. ...", "오답. ...", ...],
      "glossary": [{ "term": "...", "definition": "..." }],
      "source": [{ "type": "user-guide", "url": "...", "path": "...", "section": "..." }],
      "status": "approved"
    }
  ]
}
```

도메인 비율은 NHN 공식 [시험 안내서](docs/nhn-cloud-essentials-exam-guide.md)에서 추출. 시험 60문제 × 5배 = 300문제 목표.

## 콘텐츠 생성 워크플로

1. **사용자 가이드 크롤링** — `node scripts/crawl-guide.mjs` → `data/source/guide/**/*.md` (gitignored, 재생성 가능)
2. **용어 사전 변환** — NHN 공식 glossary.xlsx → `data/source/glossary.json` (341 terms) via `scripts/build-glossary.mjs`
3. **문제 생성** — `.claude/agents/question-generator.md` subagent에 도메인 + 가이드 청크 + batch size 전달
4. **검수** — 결과를 `data/staging/<domain>/batch-NN.json`으로 저장, 사용자가 검수 후 approved로 `data/questions.json`에 반영
5. **자동 배포** — git push → Vercel 자동 빌드

## 로드맵

- [x] **1단계** — Next.js 마이그레이션 + 풀이/해설 모드 토글 + Vercel 배포
- [x] **1.5단계** — URL 정리 (`cert-quiz-psi.vercel.app`) + 홈/이전 버튼 + AI agent 첫 사이클
- [x] **1.6단계 (진행 중)** — 출처 기반 콘텐츠 시스템: v2 스키마, 사용자 가이드 크롤링, 용어 사전 캐시, question-generator subagent, sample 5문제 검수 완료
- [ ] **1.7단계** — 300문제 batch 본격 생성 (도메인별 batch 검수 사이클)
- [ ] **2단계** — PWA (manifest, service worker) + 커스텀 도메인
- [ ] **3단계** — Spring Boot 백엔드 + AWS 배포 + Google OAuth + 풀이 기록
- [ ] **4단계** — 공유 / 피드백 루프
- [ ] **5단계** — AI 해설 보강 자동화
- [ ] **+옵션** — Capacitor 패키징 → iOS App Store

설계 문서: [`docs/superpowers/specs/`](docs/superpowers/specs/)
구현 계획: [`docs/superpowers/plans/`](docs/superpowers/plans/)

## 피드백

문제·해설 오류, UX 개선 제안, 추가하고 싶은 자격증 등은 [GitHub Issues](https://github.com/eunsu5543/cert-quiz/issues)로 받습니다.

## 라이선스

미정.
