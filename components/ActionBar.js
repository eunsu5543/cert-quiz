'use client';
import { useMode } from '@/contexts/ModeContext';

export default function ActionBar({ revealed, hasSelection, onReveal, onNext, onPrev, isFirst, isLast }) {
  const { mode } = useMode();
  const isStudy = mode === 'study';
  const nextLabel = isLast ? '결과 보기' : '다음 문제';
  const showNextOrReveal = isStudy || revealed;

  return (
    <div className="actions">
      <div className="inner">
        <button
          className="btn secondary"
          style={{ flex: '0 0 30%' }}
          disabled={isFirst}
          onClick={onPrev}
        >
          이전
        </button>
        {showNextOrReveal ? (
          <button className="btn" onClick={onNext}>{nextLabel}</button>
        ) : (
          <button className="btn" disabled={!hasSelection} onClick={onReveal}>
            정답 확인
          </button>
        )}
      </div>
    </div>
  );
}
