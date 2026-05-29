'use client';
import { useMode } from '@/contexts/ModeContext';

export default function ActionBar({ revealed, hasSelection, onReveal, onNext, isLast }) {
  const { mode } = useMode();
  const isStudy = mode === 'study';
  const nextLabel = isLast ? '결과 보기' : '다음 문제';

  if (isStudy || revealed) {
    return (
      <div className="actions">
        <div className="inner">
          <button className="btn" onClick={onNext}>{nextLabel}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="actions">
      <div className="inner">
        <button className="btn" disabled={!hasSelection} onClick={onReveal}>
          정답 확인
        </button>
      </div>
    </div>
  );
}
