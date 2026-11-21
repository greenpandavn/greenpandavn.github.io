export default function ProgressBar({ value, color = 'bg-leaf-500', className = '' }: { value: number; color?: string; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`h-4 w-full overflow-hidden rounded-full bg-cloud ${className}`} role="progressbar" aria-valuenow={Math.round(pct)}>
      <div className={`relative h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }}>
        {pct > 6 && <div className="absolute left-2 right-2 top-1 h-1 rounded-full bg-white/40" />}
      </div>
    </div>
  );
}
