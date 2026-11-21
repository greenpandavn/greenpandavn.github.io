import type { ThemeId } from '../types';

type Scale = [string, string, string, string, string, string]; // 50 100 400 500 600 700

export const THEMES: { id: ThemeId; name: string; scale: Scale }[] = [
  { id: 'leaf', name: 'Xanh lá Gấu Trúc', scale: ['#effbe6', '#d9f5c4', '#7ed957', '#58cc02', '#46a302', '#3b8a02'] },
  { id: 'ocean', name: 'Biển xanh', scale: ['#e6faf8', '#c2f2ec', '#3fd6c4', '#14b8a6', '#0f9488', '#0d7a70'] },
  { id: 'grape', name: 'Tím nho', scale: ['#f5ecff', '#e9d6ff', '#b98cff', '#9b5cf6', '#7e3fe0', '#6a2fc4'] },
  { id: 'sakura', name: 'Hồng anh đào', scale: ['#fff0f6', '#ffd6e8', '#ff8fc0', '#f7559a', '#d93c7f', '#b82e69'] },
  { id: 'sunset', name: 'Cam hoàng hôn', scale: ['#fff4e6', '#ffe2bf', '#ffb04d', '#ff9600', '#d87f00', '#b56a00'] },
];

const SURFACE_DARK = '#18202b';
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const triple = (c: number[]) => c.map((v) => Math.round(v)).join(' ');
const mix = (a: string, b: string, t: number) => {
  const x = rgb(a);
  const y = rgb(b);
  return x.map((v, i) => v * t + y[i] * (1 - t));
};

let applied = '';
/** Apply the colour scheme (CSS variables used by Tailwind's `leaf-*` palette) and dark mode. */
export function applyTheme(id: ThemeId, dark: boolean) {
  if (typeof document === 'undefined') return;
  const key = `${id}|${dark}`;
  if (key === applied) return;
  applied = key;
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  const root = document.documentElement;
  const [s50, s100, s400, s500, s600, s700] = t.scale;
  const vars: Record<string, string> = {
    '--leaf-50': triple(dark ? mix(s500, SURFACE_DARK, 0.16) : rgb(s50)),
    '--leaf-100': triple(dark ? mix(s500, SURFACE_DARK, 0.3) : rgb(s100)),
    '--leaf-400': triple(rgb(s400)),
    '--leaf-500': triple(rgb(s500)),
    '--leaf-600': triple(rgb(s600)),
    '--leaf-700': triple(rgb(dark ? s400 : s700)),
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.classList.toggle('dark', dark);
  root.style.colorScheme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? SURFACE_DARK : s500);
}

export const isDark = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
