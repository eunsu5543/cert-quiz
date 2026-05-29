'use client';

export default function StatsScreen({ results, domains, total, onRestart }) {
  const correctCount = results.filter((r) => r.correct).length;
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
            <div className="bar">
              <div className="bar-fill" style={{ width: pct + '%', background: d.color }} />
            </div>
            <span className="stat-num">{s.correct}/{s.total}</span>
          </div>
        );
      })}
      <button className="btn" style={{ marginTop: 24 }} onClick={onRestart}>
        다시 시작
      </button>
    </div>
  );
}
