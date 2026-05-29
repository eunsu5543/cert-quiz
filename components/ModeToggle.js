'use client';
import { useMode } from '@/contexts/ModeContext';

export default function ModeToggle() {
  const { mode, setMode } = useMode();
  const isStudy = mode === 'study';
  return (
    <div
      className="toggle"
      onClick={() => setMode(isStudy ? 'solve' : 'study')}
      role="switch"
      aria-checked={isStudy}
      style={{ cursor: 'pointer' }}
    >
      <div>
        <strong>{isStudy ? '해설 모드' : '풀이 모드'}</strong>
        <div className="hint">{isStudy ? '정답·해설 펼침, 카드 넘기기' : '풀이 후 정답 확인'}</div>
      </div>
      <div className={`switch ${isStudy ? 'on' : ''}`} />
    </div>
  );
}
