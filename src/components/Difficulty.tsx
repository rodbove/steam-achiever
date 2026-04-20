export function DifficultyBars({ level }: { level: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span className="inline-flex items-center text-ink" aria-label={`Difficulty ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`diff-bar ${i > level ? 'dim' : ''}`} />
      ))}
    </span>
  );
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  if (m < 60 * 24) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  }
  return `${Math.round(m / 60)}h`;
}
