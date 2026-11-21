import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24, p: P) => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, ...p });

export const Flame = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M12 2c1 3.5 5 5.5 5 10.5A5 5 0 0 1 7 13c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5Z" fill="#ff9600" />
    <path d="M12 12c.5 1.5 2.5 2.3 2.5 4.3a2.5 2.5 0 0 1-5 0c0-1 .5-1.8 1-2.3.2 1 .7 1.3 1 1.3 0-1.2-.2-2.2.5-3.3Z" fill="#ffd84d" />
  </svg>
);
export const Gem = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M6 3h12l4 6-10 12L2 9l4-6Z" fill="#1cb0f6" />
    <path d="M2 9h20L12 21 2 9Z" fill="#1899d6" />
    <path d="M8 3 6.5 9 12 21 9.2 9 12 3h-4Z" fill="#84d8ff" opacity=".7" />
  </svg>
);
export const Heart = ({ size, filled = true, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size, p)}>
    <path
      d="M12 21s-8-5.2-8-11.2A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.8C20 15.8 12 21 12 21Z"
      fill={filled ? '#ff4b4b' : '#e5e5e5'}
    />
    {filled && <ellipse cx="8.5" cy="9.5" rx="1.6" ry="1" fill="#fff" opacity=".6" />}
  </svg>
);
export const Bolt = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="#ffc800" stroke="#e5a800" strokeWidth="1" strokeLinejoin="round" />
  </svg>
);
export const Star = ({ size, fill = '#ffc800', ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="m12 2 3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8L12 2Z" fill={fill} />
  </svg>
);
export const Lock = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="5" y="10" width="14" height="11" rx="2.5" fill="currentColor" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.5" fill="none" />
  </svg>
);
export const Check = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Close = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
export const Speaker = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 9h4l5-4v14l-5-4H4V9Z" fill="currentColor" />
    <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);
export const Turtle = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <ellipse cx="11" cy="13" rx="7" ry="5" fill="currentColor" />
    <circle cx="19.5" cy="12" r="2.2" fill="currentColor" />
    <path d="M6 17.5v2M15 17.5v2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);
export const Mic = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M6 11a6 6 0 0 0 12 0M12 17v4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);
export const Brush = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M20 3 10 13l1.5 1.5L21.5 4.5 20 3Z" fill="currentColor" />
    <path d="M9 14c-3 0-4 2-4 3.5S4 20 3 20.5c3 .5 7 0 7.5-3.5L9 14Z" fill="currentColor" />
  </svg>
);
export const Home = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" fill="currentColor" />
  </svg>
);
export const Refresh = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const BookIcon = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H11v17H5.5A1.5 1.5 0 0 1 4 18.5v-14ZM13 3h5.5A1.5 1.5 0 0 1 20 4.5v14a1.5 1.5 0 0 1-1.5 1.5H13V3Z" fill="currentColor" />
  </svg>
);
export const User = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="8" r="4.5" fill="currentColor" />
    <path d="M3.5 21a8.5 8.5 0 0 1 17 0H3.5Z" fill="currentColor" />
  </svg>
);
export const Chevron = ({ size, dir = 'right', ...p }: P & { dir?: 'left' | 'right' }) => (
  <svg {...base(size, p)} style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}>
    <path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const Gift = ({ size, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="3" y="9" width="18" height="12" rx="2" fill="#ce82ff" />
    <rect x="2" y="7" width="20" height="4" rx="1.5" fill="#a560e8" />
    <rect x="10.5" y="7" width="3" height="14" fill="#ffd84d" />
    <path d="M12 7c-2-4-6-4-6-1.5S10 7 12 7Zm0 0c2-4 6-4 6-1.5S14 7 12 7Z" fill="#ffd84d" />
  </svg>
);

const BADGE_GLYPH: Record<string, string> = {
  sprout: 'M12 21v-8m0 0c0-4 3-6 7-6 0 4-3 6-7 6Zm0 2c0-3-2.5-5-6-5 0 3 2.5 5 6 5Z',
  book: 'M5 4h6v16H5zM13 4h6v16h-6z',
  cap: 'M2 9l10-5 10 5-10 5L2 9Zm4 2.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5',
  trophy: 'M7 4h10v5a5 5 0 0 1-10 0V4Zm5 10v4m-4 2h8M7 6H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4',
  flame: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5Z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  star: 'm12 3 2.7 5.6 6.1.8-4.5 4.2 1.2 6.1L12 16.8l-5.5 2.9 1.2-6.1L3.2 9.4l6.1-.8L12 3Z',
  crown: 'M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8Z',
  brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1Zm6 0a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
};

export const BadgeGlyph = ({ name, size = 28, color = '#fff' }: { name: string; size?: number; color?: string }) => {
  const filled = ['flame', 'bolt', 'star', 'crown', 'zap', 'target'].includes(name);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d={BADGE_GLYPH[name] ?? BADGE_GLYPH.star}
        fill={filled ? color : 'none'}
        fillRule="evenodd"
        stroke={filled ? 'none' : color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
