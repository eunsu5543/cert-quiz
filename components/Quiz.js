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
    setIdx(0);
    setSelected(new Set());
    setRevealed(false);
    setResults([]);
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
              onClick={() => setStarted(true)}
            >
              시작하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (idx >= filtered.length) {
    return (
      <div className="app">
        <div className="card"><ModeToggle /></div>
        <StatsScreen
          results={results}
          domains={allDomains}
          total={filtered.length}
          onRestart={restart}
        />
      </div>
    );
  }

  const q = filtered[idx];
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

  return (
    <div className="app">
      <div className="card"><ModeToggle /></div>
      <div className="topbar">
        <span>{idx + 1} / {filtered.length}</span>
        <span>{domainMeta.name}</span>
      </div>
      <ProgressBar current={idx} total={filtered.length} />
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
        isLast={idx === filtered.length - 1}
      />
    </div>
  );
}
