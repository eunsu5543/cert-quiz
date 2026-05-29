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
  const domainColor = domainMeta.color || '#0064FF';

  return (
    <div className="card">
      <div className="topbar">
        <span
          className="badge"
          style={{ background: domainColor + '22', color: domainColor }}
        >
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
          } else if (sel) {
            cls += ' selected';
          }
          return (
            <div
              key={idx}
              className={cls}
              onClick={() => {
                if (!isStudy && !revealed) onSelect(idx);
              }}
            >
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
