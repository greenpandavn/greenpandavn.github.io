export type Mood = 'happy' | 'sad' | 'neutral' | 'cheer' | 'think';

/** Original cute panda mascot ("Gấu Trúc Mập"). */
export default function Panda({ size = 120, mood = 'happy', className = '' }: { size?: number; mood?: Mood; className?: string }) {
  const mouth =
    mood === 'sad' ? (
      <path d="M52 86 Q60 80 68 86" stroke="#2d2d2d" strokeWidth="3" fill="none" strokeLinecap="round" />
    ) : mood === 'cheer' ? (
      <path d="M50 81 Q60 94 70 81 Z" fill="#e94b5c" stroke="#2d2d2d" strokeWidth="2.5" strokeLinejoin="round" />
    ) : mood === 'think' ? (
      <path d="M54 84 L66 83" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round" />
    ) : (
      <path d="M51 82 Q60 90 69 82" stroke="#2d2d2d" strokeWidth="3" fill="none" strokeLinecap="round" />
    );
  const eyes =
    mood === 'cheer' ? (
      <>
        <path d="M37 60 q5 -6 10 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M73 60 q5 -6 10 0" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="43" cy="60" r="4.5" fill="#fff" />
        <circle cx="77" cy="60" r="4.5" fill="#fff" />
        <circle cx="44" cy="59" r="1.6" fill="#2d2d2d" />
        <circle cx="78" cy="59" r="1.6" fill="#2d2d2d" />
      </>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 120 130" className={className} role="img" aria-label="Gấu trúc">
      {/* body */}
      <ellipse cx="60" cy="112" rx="34" ry="18" fill="#2d2d2d" />
      <ellipse cx="60" cy="110" rx="22" ry="13" fill="#fff" />
      {/* ears */}
      <circle cx="26" cy="28" r="15" fill="#2d2d2d" />
      <circle cx="94" cy="28" r="15" fill="#2d2d2d" />
      <circle cx="26" cy="28" r="7" fill="#5a5a5a" />
      <circle cx="94" cy="28" r="7" fill="#5a5a5a" />
      {/* head */}
      <ellipse cx="60" cy="62" rx="44" ry="40" fill="#fff" stroke="#2d2d2d" strokeWidth="3" />
      {/* eye patches */}
      <ellipse cx="42" cy="60" rx="11" ry="13" fill="#2d2d2d" transform="rotate(-25 42 60)" />
      <ellipse cx="78" cy="60" rx="11" ry="13" fill="#2d2d2d" transform="rotate(25 78 60)" />
      {eyes}
      {/* cheeks */}
      <ellipse cx="30" cy="78" rx="7" ry="4" fill="#ffb3c1" opacity=".8" />
      <ellipse cx="90" cy="78" rx="7" ry="4" fill="#ffb3c1" opacity=".8" />
      {/* nose */}
      <ellipse cx="60" cy="74" rx="6" ry="4" fill="#2d2d2d" />
      {mouth}
      {/* bamboo leaf on head */}
      <path d="M62 22 q10 -14 24 -12 q-8 12 -24 12Z" fill="#58cc02" />
      <path d="M62 22 q12 -6 22 -11" stroke="#46a302" strokeWidth="1.5" fill="none" />
      {mood === 'sad' && <path d="M84 70 q3 6 0 9 q-3 -3 0 -9Z" fill="#7cc8ff" />}
    </svg>
  );
}

export function PandaSays({ text, mood = 'happy', size = 90 }: { text: string; mood?: Mood; size?: number }) {
  return (
    <div className="flex items-end gap-2">
      <Panda size={size} mood={mood} className="shrink-0" />
      <div className="relative mb-6 rounded-2xl border-2 border-cloud bg-white px-4 py-3 text-[15px] font-bold text-ink-700 shadow-sm">
        <span className="absolute -left-2 bottom-4 h-4 w-4 rotate-45 border-b-2 border-l-2 border-cloud bg-white" />
        {text}
      </div>
    </div>
  );
}
