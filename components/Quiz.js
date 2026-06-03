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

// Fisher-Yates shuffle (copy, non-mutating) — used to randomize question order each run.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Quiz() {
  const { mode } = useMode();
  const allDomains = data.domains;
  const allQuestions = data.questions;

  const [selectedDomains, setSelectedDomains] = useState(() => new Set(Object.keys(allDomains)));
  const [started, setStarted] = useState(false);
  // Shuffled question order for the current run; set fresh on each start (random each time).
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState([]);

  const filtered = useMemo(
    () => allQuestions.filter((q) => selectedDomains.has(q.domain)),
    [allQuestions, selectedDomains]
  );

  const toggleDomain = (key) => {
    const next = new Set(selectedDomains);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (next.size === 0) return;
    setSelectedDomains(next);
  };

  const restart = () => {
    setStarted(false);
    setQuizQuestions([]);
    setIdx(0);
    setSelected(new Set());
    setRevealed(false);
    setResults([]);
  };

  const handleHome = () => {
    if (results.length === 0 || confirm('현재 풀이를 종료하고 처음으로 돌아갈까요?')) {
      restart();
    }
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
        <div className="actions">
          <div className="inner">
            <button
              className="btn"
              disabled={filtered.length === 0}
              onClick={() => {
                setQuizQuestions(shuffle(filtered));
                setIdx(0);
                setResults([]);
                setStarted(true);
              }}
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (idx >= quizQuestions.length) {
    return (
      <div className="app">
        <Header onHome={handleHome} />
        <StatsScreen
          results={results}
          domains={allDomains}
          total={quizQuestions.length}
          onRestart={restart}
        />
      </div>
    );
  }

  const q = quizQuestions[idx];
  const domainMeta = allDomains[q.domain] || { name: q.domain, color: '#0064FF' };

  const handleSelect = (i) => {
    const next = new Set(selected);
    if (q.type === 'single') {
      next.clear();
      next.add(i);
    } else {
      if (next.has(i)) next.delete(i);
      else next.add(i);
    }
    setSelected(next);
  };

  const handleReveal = () => {
    setRevealed(true);
    const correctSet = new Set(q.answer);
    const correct =
      selected.size === correctSet.size && [...selected].every((s) => correctSet.has(s));
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

  const handlePrev = () => {
    if (idx === 0) return;
    // truncate any results recorded for this and prior question (re-attempt-friendly)
    setResults(results.slice(0, idx - 1));
    setIdx(idx - 1);
    setSelected(new Set());
    setRevealed(false);
  };

  return (
    <div className="app">
      <Header onHome={handleHome} />
      <div className="topbar">
        <span>{idx + 1} / {quizQuestions.length}</span>
        <span>{domainMeta.name}</span>
      </div>
      <ProgressBar current={idx} total={quizQuestions.length} />
      <QuestionCard
        question={q}
        selected={selected}
        revealed={revealed}
        onSelect={handleSelect}
        domainMeta={domainMeta}
      />
      <ActionBar
        revealed={revealed}
        hasSelection={selected.size > 0}
        onReveal={handleReveal}
        onNext={handleNext}
        onPrev={handlePrev}
        isFirst={idx === 0}
        isLast={idx === quizQuestions.length - 1}
      />
    </div>
  );
}

function Header({ onHome }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        className="btn secondary"
        style={{ flex: '0 0 auto', minHeight: 36, padding: '6px 14px', fontSize: 14 }}
        onClick={onHome}
      >
        홈
      </button>
      <div style={{ flex: 1 }}>
        <ModeToggle />
      </div>
    </div>
  );
}
