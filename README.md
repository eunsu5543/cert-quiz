# cert-quiz

자격증 학습 플랫폼. NHN Cloud Essentials 모의고사를 시드로, 향후 AWS·CKA 등 여러 자격증으로 확장 예정.

🌐 **Live**: https://cert-quiz-psi.vercel.app

## 특징

- **풀이 모드 / 해설 모드 토글** — 풀이 모드는 정답 확인 후 해설, 해설 모드는 정답·해설이 처음부터 펼쳐져 카드 넘기듯 읽기
- **도메인별 필터** — 원하는 출제 영역만 선택해 풀기
- **모바일 친화** — iOS safe-area inset, iPhone Dynamic Island 영역 처리
- **정적 사이트** — Next.js `output: 'export'`로 Vercel 배포 (백엔드 의존 0)

## 기술 스택

- Next.js 14 (App Router, JS)
- React 18
- Vercel (호스팅)

## 로컬 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 정적 export → out/
```

## 데이터 구조

자격증 1개 = JSON 파일 1개. 현재는 `data/questions.json` 하나.

```jsonc
{
  "meta": { "id": "nhn-cloud-essentials", "name": "NHN Cloud Essentials" },
  "domains": {
    "compute": { "name": "Compute", "color": "#0064FF" }
    // ...
  },
  "questions": [
    {
      "id": 1,
      "domain": "compute",
      "type": "single",       // "single" | "multi"
      "q": "문제 본문",
      "options": ["A", "B", "C", "D"],
      "answer": [1],           // 정답 인덱스 배열 (0-based)
      "explain": "해설 텍스트"
    }
  ]
}
```

기존 단일 HTML 파일(`nhn-cloud-essentials-quiz.html`)에서 데이터 추출은 `scripts/extract-data.mjs`로 자동화. 다른 자격증 추가 시 동일한 스키마의 JSON만 떨구면 됩니다.

## 로드맵

- [x] **1단계** — Next.js 마이그레이션 + 풀이/해설 모드 토글 + Vercel 배포
- [ ] **1.5단계** — 자격증 선택 홈 + 두 번째 자격증 JSON + 라우팅 추상화
- [ ] **2단계** — PWA (manifest, service worker) + 커스텀 도메인
- [ ] **3단계** — Spring Boot 백엔드 + AWS 배포 (EC2/ECS + RDS + S3) + Google OAuth + 풀이 기록
- [ ] **4단계** — 공유 / 피드백 루프
- [ ] **5단계** — AI 해설 보강 (Claude API)
- [ ] **+옵션** — Capacitor 패키징 → iOS App Store

설계 문서: [`docs/superpowers/specs/`](docs/superpowers/specs/)
구현 계획: [`docs/superpowers/plans/`](docs/superpowers/plans/)

## 피드백

문제·해설 오류, UX 개선 제안, 추가하고 싶은 자격증 등은 [GitHub Issues](https://github.com/eunsu5543/cert-quiz/issues)로 받습니다.

## 라이선스

미정.
