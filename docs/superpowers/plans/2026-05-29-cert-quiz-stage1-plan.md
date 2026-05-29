# 자격증 학습 플랫폼 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 NHN Cloud Essentials 모의고사 단일 HTML을 Next.js 정적 사이트로 마이그레이션 + 풀이/해설 모드 토글 추가 + Vercel CLI 배포. 18:00까지 iPhone 17 Chrome에서 동작하는 URL 확보.

**Architecture:** Next.js 14+ App Router, JS (no TS), `output: 'export'` 정적 export. 기존 HTML/CSS/JS를 React 컴포넌트로 1:1 마이그레이션. ModeContext (Context API)로 풀이/해설 모드를 전역 공유, localStorage 영속화. Vercel CLI 직접 배포 (GitHub 미경유).

**Tech Stack:** Next.js 14+, React 18+, JavaScript (ESM), globals.css, Vercel CLI

**Timebox:** 14:00–18:00. Task별 추정: 0(10m) · 1(10m) · 2(5m) · 3(10m) · 4(15m) · 5(60m) · 6(5m) · 7(15m) · 8(30m) ≈ 2.7h.

**Note on TDD:** Spec에 자동화 테스트는 명시적 out-of-scope. 각 task는 "코드 → 로컬 dev 수동 확인 → 커밋"으로 진행.

---

## File Structure

To create:
- `package.json`, `next.config.mjs`, `jsconfig.json`, `.gitignore`
- `app/layout.js`, `app/page.js`, `app/globals.css`
- `components/Quiz.js`, `components/ModeToggle.js`, `components/DomainFilter.js`, `components/QuestionCard.js`, `components/ActionBar.js`, `components/StatsScreen.js`, `components/ProgressBar.js`
- `contexts/ModeContext.js`
- `data/questions.json`
- `scripts/extract-data.mjs` (1회용)

To keep as legacy reference:
- `nhn-cloud-essentials-quiz.html`

---

### Task 0: Git 초기화 + Next.js 프로젝트 셋업

**Files:**
- Create: `package.json`, `next.config.mjs`, `jsconfig.json`, `.gitignore`

- [ ] **Step 1: Git 초기화 + 첫 커밋**

```powershell
git init -b main
git add nhn-cloud-essentials-quiz.html docs/
git commit -m "chore: initial commit with legacy HTML and stage1 spec"
```

- [ ] **Step 2: package.json 생성**

`package.json`:
```json
{
  "name": "cert-quiz",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

- [ ] **Step 3: next.config.mjs (정적 export)**

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true
};
export default nextConfig;
```

- [ ] **Step 4: jsconfig.json (path alias @/*)**

`jsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

- [ ] **Step 5: .gitignore**

`.gitignore`:
```
node_modules/
.next/
out/
.vercel/
.DS_Store
*.log
```

- [ ] **Step 6: 의존성 설치**

```powershell
npm install
```
Expected: `node_modules/`, `package-lock.json` 생성. 에러 없음.

- [ ] **Step 7: 커밋**

```powershell
git add package.json package-lock.json next.config.mjs jsconfig.json .gitignore
git commit -m "chore: next.js project scaffold with static export"
```

---

### Task 1: 데이터 추출 (HTML → questions.json)

**Files:**
- Create: `scripts/extract-data.mjs`, `data/questions.json`

- [ ] **Step 1: 추출 스크립트 작성**

`scripts/extract-data.mjs`:
```js
import fs from 'fs';
import vm from 'vm';

const html = fs.readFileSync('nhn-cloud-essentials-quiz.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('script block not found');
const code = scriptMatch[1];

const context = { console };
vm.createContext(context);
vm.runInContext(code + '\nthis.__OUT = { DOMAINS, QUESTIONS };', context);
const { DOMAINS, QUESTIONS } = context.__OUT;

if (!Array.isArray(QUESTIONS) || QUESTIONS.length === 0) {
  throw new Error('QUESTIONS not extracted');
}

const output = {
  meta: { id: 'nhn-cloud-essentials', name: 'NHN Cloud Essentials' },
  domains: DOMAINS,
  questions: QUESTIONS
};

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/questions.json', JSON.stringify(output, null, 2), 'utf8');
console.log(`Extracted ${QUESTIONS.length} questions across ${Object.keys(DOMAINS).length} domains`);
```

- [ ] **Step 2: 실행 + 검증**

```powershell
node scripts/extract-data.mjs
```
Expected: `Extracted ~300 questions across 6 domains` 출력.
만약 일부 문제만 추출되거나 에러 발생 시: 기존 HTML이 여러 `<script>` 블록을 가질 가능성 확인. 정규식을 마지막 큰 블록 매치로 변경하거나 명시 마커 추가.

- [ ] **Step 3: sanity check**

```powershell
Get-Content data/questions.json -TotalCount 30
```
Expected: `meta`, `domains` (6개 키), `questions` 배열 시작 보임.

- [ ] **Step 4: 커밋**

```powershell
git add scripts/extract-data.mjs data/questions.json
git commit -m "feat: extract questions data from legacy HTML to JSON"
```

---

### Task 2: 글로벌 CSS 이식

**Files:**
- Create: `app/globals.css`

- [ ] **Step 1: 기존 HTML `<style>` 블록 그대로 복사**

기존 `nhn-cloud-essentials-quiz.html` 의 `<style>...</style>` 안쪽 (line ~10 ~ ~257) 전체를 `app/globals.css`에 그대로 붙여넣기. 수정 없이 1:1.

(Read 도구로 해당 라인 범위 가져온 뒤 Write로 globals.css 생성.)

- [ ] **Step 2: 커밋**

```powershell
git add app/globals.css
git commit -m "feat: port legacy CSS to globals.css verbatim"
```

---

### Task 3: 최소 layout/page + dev sanity check

**Files:**
- Create: `app/layout.js`, `app/page.js`

- [ ] **Step 1: app/layout.js**

`app/layout.js`:
```jsx
import './globals.css';

export const metadata = {
  title: 'NHN Cloud Essentials 모의고사',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0064FF',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: app/page.js (임시)**

`app/page.js`:
```jsx
export default function Home() {
  return (
    <div className="app">
      <h1>NHN Cloud Essentials 모의고사</h1>
      <p className="sub">Booting...</p>
    </div>
  );
}
```

- [ ] **Step 3: dev 서버 가동**

```powershell
npm run dev
```
브라우저에서 `http://localhost:3000` 접속, "Booting..." 표시되고 CSS가 적용된 색감/폰트로 보이면 OK. 끝나면 Ctrl+C로 종료.

- [ ] **Step 4: 커밋**

```powershell
git add app/
git commit -m "feat: minimal layout and home page"
```

---

### Task 4: ModeContext + ModeToggle

**Files:**
- Create: `contexts/ModeContext.js`, `components/ModeToggle.js`
- Modify: `app/layout.js`

- [ ] **Step 1: ModeContext.js**

`contexts/ModeContext.js`:
```jsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const ModeContext = createContext({ mode: 'solve', setMode: () => {} });

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState('solve');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('quiz-mode');
      if (saved === 'solve' || saved === 'study') setModeState(saved);
    } catch {}
  }, []);

  const setMode = (next) => {
    setModeState(next);
    try { localStorage.setItem('quiz-mode', next); } catch {}
  };

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export const useMode = () => useContext(ModeContext);
```

- [ ] **Step 2: ModeToggle.js**

`components/ModeToggle.js`:
```jsx
'use client';
import { useMode } from '@/contexts/ModeContext';

export default function ModeToggle() {
  const { mode, setMode } = useMode();
  const isStudy = mode === 'study';
  return (
    <div className="toggle"
      onClick={() => setMode(isStudy ? 'solve' : 'study')}
      role="switch" aria-checked={isStudy}
      style={{ cursor: 'pointer' }}>
      <div>
        <strong>{isStudy ? '해설 모드' : '풀이 모드'}</strong>
        <div className="hint">{isStudy ? '정답·해설 펼침, 카드 넘기기' : '풀이 후 정답 확인'}</div>
      </div>
      <div className={`switch ${isStudy ? 'on' : ''}`} />
    </div>
  );
}
```

- [ ] **Step 3: layout에 ModeProvider 감싸기**

`app/layout.js`:
```jsx
import './globals.css';
import { ModeProvider } from '@/contexts/ModeContext';

export const metadata = { title: 'NHN Cloud Essentials 모의고사' };
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0064FF',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body><ModeProvider>{children}</ModeProvider></body>
    </html>
  );
}
```

- [ ] **Step 4: 커밋**

```powershell
git add contexts/ components/ModeToggle.js app/layout.js
git commit -m "feat: mode context (solve/study) with localStorage persistence"
```

---

### Task 5: Quiz 통합 컴포넌트

**Files:**
- Create: `components/ProgressBar.js`, `components/DomainFilter.js`, `components/QuestionCard.js`, `components/ActionBar.js`, `components/StatsScreen.js`, `components/Quiz.js`
- Modify: `app/page.js`

- [ ] **Step 1: ProgressBar.js**

`components/ProgressBar.js`:
```jsx
export default function ProgressBar({ current, total }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return (
    <div className="progress">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}
```

- [ ] **Step 2: DomainFilter.js**

`components/DomainFilter.js`:
```jsx
'use client';
export default function DomainFilter({ domains, selected, onToggle }) {
  return (
    <div className="filter-row">
      {Object.entries(domains).map(([key, d]) => (
        <span key={key}
          className={`chip ${selected.has(key) ? 'active' : ''}`}
          onClick={() => onToggle(key)}>
          {d.name}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: QuestionCard.js (모드 분기 핵심)**

`components/QuestionCard.js`:
```jsx
'use client';
import { useMode } from '@/contexts/ModeContext';

export default function QuestionCard({ question, selected, revealed, onSelect, domainMeta }) {
  const { mode } = useMode();
  const isStudy = mode === 'study';
  const correctSet = new Set(question.answer);

  const effectiveRevealed = isStudy || revealed;
  const isSelectedIdx = (idx) => {
    if (isStudy) return correctSet.has(idx);
    return selected.has(idx);
  };

  const isMulti = question.type === 'multi';

  return (
    <div className="card">
      <div className="topbar">
        <span className="badge" style={{ background: (domainMeta.color || '#0064FF') + '22', color: domainMeta.color || '#0064FF' }}>
          {domainMeta.name}
        </span>
        {isMulti && <span className="badge multi">복수 정답</span>}
      </div>
      <div className="question">{question.q}</div>
      <div className="options">
        {question.options.map((opt, idx) => {
          const sel = isSelectedIdx(idx);
          const correct = correctSet.has(idx);
          let cls = 'option';
          if (effectiveRevealed) {
            if (correct) cls += ' correct';
            else if (sel && !correct) cls += ' wrong';
          } else if (sel) cls += ' selected';
          return (
            <div key={idx} className={cls}
              onClick={() => { if (!isStudy && !revealed) onSelect(idx); }}>
              <div className="option-marker">{String.fromCharCode(65 + idx)}</div>
              <div className="option-text">{opt}</div>
            </div>
          );
        })}
      </div>
      {effectiveRevealed && (
        <div className="explanation">
          <span className="label">해설</span>
          <div style={{ whiteSpace: 'pre-wrap' }}>{question.explain}</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: ActionBar.js**

`components/ActionBar.js`:
```jsx
'use client';
import { useMode } from '@/contexts/ModeContext';

export default function ActionBar({ revealed, hasSelection, onReveal, onNext, isLast }) {
  const { mode } = useMode();
  const isStudy = mode === 'study';

  const nextLabel = isLast ? '결과 보기' : '다음 문제';

  if (isStudy || revealed) {
    return (
      <div className="actions"><div className="inner">
        <button className="btn" onClick={onNext}>{nextLabel}</button>
      </div></div>
    );
  }

  return (
    <div className="actions"><div className="inner">
      <button className="btn" disabled={!hasSelection} onClick={onReveal}>정답 확인</button>
    </div></div>
  );
}
```

- [ ] **Step 5: StatsScreen.js**

`components/StatsScreen.js`:
```jsx
'use client';
export default function StatsScreen({ results, domains, total, onRestart }) {
  const correctCount = results.filter(r => r.correct).length;
  const score = total ? Math.round((correctCount / total) * 100) : 0;

  const byDomain = {};
  for (const r of results) {
    if (!byDomain[r.domain]) byDomain[r.domain] = { total: 0, correct: 0 };
    byDomain[r.domain].total++;
    if (r.correct) byDomain[r.domain].correct++;
  }

  return (
    <div className="card">
      <h1 className="center">결과</h1>
      <div className="score-circle">
        <div className="num">{score}</div>
        <div className="lbl">SCORE</div>
      </div>
      <p className="center">{correctCount} / {total} 정답</p>
      <h2>도메인별</h2>
      {Object.entries(byDomain).map(([key, s]) => {
        const d = domains[key] || { name: key, color: '#0064FF' };
        const pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
        return (
          <div key={key} className="domain-stat">
            <span style={{ minWidth: 110 }}>{d.name}</span>
            <div className="bar"><div className="bar-fill" style={{ width: pct + '%', background: d.color }} /></div>
            <span className="stat-num">{s.correct}/{s.total}</span>
          </div>
        );
      })}
      <button className="btn" style={{ marginTop: 24 }} onClick={onRestart}>다시 시작</button>
    </div>
  );
}
```

- [ ] **Step 6: Quiz.js (메인 흐름)**

`components/Quiz.js`:
```jsx
'use client';
import { useState, useMemo } from 'react';
import data from '@/data/questions.json';
import { useMode } from '@/contexts/ModeContext';
import ModeToggle from './ModeToggle';
import DomainFilter from './DomainFilter';
import QuestionCard from './QuestionCard';
import ActionBar from './ActionBar';
import StatsScreen from './StatsScreen';
import ProgressBar from './ProgressBar';

export default function Quiz() {
  const { mode } = useMode();
  const allDomains = data.domains;
  const allQuestions = data.questions;

  const [selectedDomains, setSelectedDomains] = useState(() => new Set(Object.keys(allDomains)));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]);

  const filtered = useMemo(() =>
    allQuestions.filter(q => selectedDomains.has(q.domain)),
    [allQuestions, selectedDomains]
  );

  const toggleDomain = (key) => {
    const next = new Set(selectedDomains);
    if (next.has(key)) next.delete(key); else next.add(key);
    if (next.size === 0) return;
    setSelectedDomains(next);
  };

  const restart = () => {
    setStarted(false); setIdx(0); setSelected(new Set()); setRevealed(false); setResults([]);
  };

  if (!started) {
    return (
      <div className="app">
        <h1>NHN Cloud Essentials 모의고사</h1>
        <p className="sub">총 {allQuestions.length}문제 · 도메인 선택 후 시작</p>
        <div className="card"><ModeToggle /></div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>도메인 선택</h2>
          <DomainFilter domains={allDomains} selected={selectedDomains} onToggle={toggleDomain} />
          <p className="hint" style={{ marginTop: 12 }}>{filtered.length}문제 선택됨</p>
        </div>
        <div className="actions"><div className="inner">
          <button className="btn" disabled={filtered.length === 0} onClick={() => setStarted(true)}>시작하기</button>
        </div></div>
      </div>
    );
  }

  if (idx >= filtered.length) {
    return (
      <div className="app">
        <div className="card"><ModeToggle /></div>
        <StatsScreen results={results} domains={allDomains} total={filtered.length} onRestart={restart} />
      </div>
    );
  }

  const q = filtered[idx];
  const domainMeta = allDomains[q.domain] || { name: q.domain, color: '#0064FF' };

  const handleSelect = (i) => {
    const next = new Set(selected);
    if (q.type === 'single') { next.clear(); next.add(i); }
    else { if (next.has(i)) next.delete(i); else next.add(i); }
    setSelected(next);
  };

  const handleReveal = () => {
    setRevealed(true);
    const correctSet = new Set(q.answer);
    const correct = selected.size === correctSet.size && [...selected].every(s => correctSet.has(s));
    setResults([...results, { id: q.id, domain: q.domain, correct }]);
  };

  const handleNext = () => {
    if (mode === 'study' && !revealed) {
      setResults([...results, { id: q.id, domain: q.domain, correct: true, read: true }]);
    }
    setIdx(idx + 1);
    setSelected(new Set());
    setRevealed(false);
  };

  return (
    <div className="app">
      <div className="card"><ModeToggle /></div>
      <div className="topbar"><span>{idx + 1} / {filtered.length}</span><span>{domainMeta.name}</span></div>
      <ProgressBar current={idx} total={filtered.length} />
      <QuestionCard question={q} selected={selected} revealed={revealed} onSelect={handleSelect} domainMeta={domainMeta} />
      <ActionBar
        revealed={revealed}
        hasSelection={selected.size > 0}
        onReveal={handleReveal}
        onNext={handleNext}
        isLast={idx === filtered.length - 1}
      />
    </div>
  );
}
```

- [ ] **Step 7: app/page.js 업데이트**

`app/page.js`:
```jsx
import Quiz from '@/components/Quiz';

export default function Home() {
  return <Quiz />;
}
```

- [ ] **Step 8: dev로 수동 검증**

```powershell
npm run dev
```
체크리스트:
1. `http://localhost:3000` 시작 화면 표시 (300문제 표기, 도메인 칩, 시작 버튼)
2. 도메인 1개만 선택해서 작게 만들어 빠르게 끝까지 가보기
3. **풀이 모드** (기본): 선택 → 정답 확인 → 정답·해설 표시 → 다음
4. **모드 토글 ON (해설 모드)**: 정답 미리 표시 + 해설 펼침 + "다음 문제" 버튼만 표시
5. 새로고침 → 모드 유지
6. 끝까지 가면 통계 화면 → "다시 시작"
7. DevTools 모바일 뷰(iPhone 14/15) 레이아웃 깨짐 없음

이슈 발견 시: 즉시 수정 후 dev 리프레시.

- [ ] **Step 9: 커밋**

```powershell
git add components/ app/page.js
git commit -m "feat: quiz components with study/solve mode branching"
```

---

### Task 6: 정적 빌드 검증

- [ ] **Step 1: 빌드 실행**

```powershell
npm run build
```
Expected: `out/` 디렉토리 생성, 에러 없음. 워닝은 OK.

흔한 에러 대응:
- "useState/useContext only allowed in Client Component" → 해당 파일에 `'use client'` 빠짐. 파일 첫 줄에 추가.
- "Module not found @/..." → `jsconfig.json` 의 `paths` 확인.

- [ ] **Step 2: out/ 로컬 서빙 sanity check**

```powershell
npx serve out
```
표시되는 URL (보통 `http://localhost:3000`)로 접속해 정적 빌드 결과가 dev와 동일하게 동작하는지 확인. 끝나면 Ctrl+C.

---

### Task 7: Vercel 배포

- [ ] **Step 1: Vercel CLI 설치**

```powershell
npm i -g vercel
```

- [ ] **Step 2: Vercel 로그인**

```powershell
vercel login
```
프롬프트에서 "Continue with Google" 선택 → 브라우저에서 인증 → 터미널 "Success!" 확인.

- [ ] **Step 3: 첫 배포 (Preview 또는 link)**

```powershell
vercel
```
프롬프트 응답:
- `Set up and deploy "..."?` → `y`
- `Which scope?` → 본인 계정 선택
- `Link to existing project?` → `n`
- `Project name?` → 기본값 또는 `cert-quiz` Enter
- `Code directory?` → `./` Enter (기본)
- `Modify settings?` → `n`

빌드 후 Preview URL 출력.

- [ ] **Step 4: 프로덕션 배포**

```powershell
vercel --prod
```
Production URL 출력 (예: `https://cert-quiz-<random>.vercel.app`).

- [ ] **Step 5: Production URL 메모**

출력된 URL을 그대로 복사. 다음 task에서 사용.

---

### Task 8: iPhone 17 Chrome 실기기 검증

- [ ] **Step 1: URL을 폰으로 전송**

Production URL을 본인 카톡 "나에게 보내기" 또는 메모 앱에 붙여넣어 iPhone으로 전송.

- [ ] **Step 2: iPhone 17 Chrome 앱에서 접속**

Chrome 앱 실행 → URL 입력 → 페이지 로드 확인.

- [ ] **Step 3: DoD 체크리스트 (spec 기준)**

- [ ] 시작 화면 정상 (300문제 표기, 도메인 필터, 시작 버튼)
- [ ] 풀이 모드: 선택 → 정답 확인 → 정답/오답 색 + 해설 표시 → 다음 문제
- [ ] 모드 토글 → 해설 모드: 정답 미리 표시, 해설 펼침, "다음 문제" 버튼만
- [ ] 새로고침 후 모드 유지 (localStorage)
- [ ] 상단 Dynamic Island 영역에 콘텐츠 가려짐 없음
- [ ] 하단 액션바가 Home Indicator 영역 안 잘림 (safe-area-inset-bottom 적용)
- [ ] 끝까지 풀어 통계 화면 도달 → "다시 시작" 동작
- [ ] 도메인별 점수 바 정상 표시
- [ ] 가로 스크롤 없음, 폰트/색상 깨짐 없음

- [ ] **Step 4: 이슈 발견 시 대응**

증상 → 대응:
- Dynamic Island에 가림 → `app/globals.css` 의 `body { padding: env(safe-area-inset-top) ... }` 가 살아있는지 확인. 없으면 추가.
- 액션바 home indicator 가림 → `.actions` 의 `padding-bottom: calc(12px + env(safe-area-inset-bottom))` 확인.
- 한글 폰트 깨짐 → `font-family` 에 `"Apple SD Gothic Neo"` 존재 확인.
- 모드 토글 안 됨 → DevTools(데스크탑)로 LocalStorage 동작 확인. 'use client' 누락 점검.

수정 후 재배포:
```powershell
vercel --prod
```

- [ ] **Step 5: 최종 확인 + 커밋**

모든 DoD 통과되면:
```powershell
git add -A
git commit -m "feat: stage 1 complete - cert quiz live on iphone chrome"
git log --oneline
```

---

## Self-Review

**Spec coverage 체크:**
- Next.js App Router + static export → Task 0 ✅
- 기존 CSS 1:1 이식 → Task 2 ✅
- React 컴포넌트 이식 → Task 5 ✅
- data/questions.json 분리 → Task 1 ✅
- 모드 토글 (localStorage) → Task 4 ✅
- Vercel CLI 배포 → Task 7 ✅
- iPhone 17 Chrome 검증 + Dynamic Island 처리 → Task 8 ✅
- DoD 모든 항목 → Task 8 Step 3 체크리스트 ✅
- 300문제 마이그레이션 누락 없음 → Task 1 Step 2 (카운트 출력 검증) ✅

**Placeholder scan:** 없음 — 모든 코드 블록·명령·기대 출력 명시.

**Type consistency:**
- `mode ∈ {'solve','study'}` 일관 (Context, Toggle, Card, ActionBar)
- `selected: Set<number>`, `revealed: boolean`, `results: array` 일관
- QuestionCard props: `{ question, selected, revealed, onSelect, domainMeta }` 일관
- ActionBar props: `{ revealed, hasSelection, onReveal, onNext, isLast }` 일관
- `question.answer: number[]` (정답 인덱스 배열) 일관
- `question.type ∈ {'single','multi'}` 일관
- `data.json` 의 `meta/domains/questions` 키 일관

OK.

---

## Execution Handoff

Plan 작성 완료, `docs/superpowers/plans/2026-05-29-cert-quiz-stage1-plan.md` 저장됨.

두 실행 옵션:

1. **Subagent-Driven (스킬 권장)** — 각 task마다 신선한 subagent 디스패치, task 사이 review
2. **Inline Execution** — 현재 세션에서 executing-plans 스킬로 batch 실행, 체크포인트마다 검토

어느 쪽으로 가시겠어요?
