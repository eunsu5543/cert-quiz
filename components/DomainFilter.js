'use client';

export default function DomainFilter({ domains, selected, onToggle }) {
  return (
    <div className="filter-row">
      {Object.entries(domains).map(([key, d]) => (
        <span
          key={key}
          className={`chip ${selected.has(key) ? 'active' : ''}`}
          onClick={() => onToggle(key)}
        >
          {d.name}
        </span>
      ))}
    </div>
  );
}
