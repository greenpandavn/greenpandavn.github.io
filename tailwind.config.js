/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito"', '"Noto Sans SC"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        han: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        leaf: { 50: 'rgb(var(--leaf-50) / <alpha-value>)', 100: 'rgb(var(--leaf-100) / <alpha-value>)', 400: 'rgb(var(--leaf-400) / <alpha-value>)', 500: 'rgb(var(--leaf-500) / <alpha-value>)', 600: 'rgb(var(--leaf-600) / <alpha-value>)', 700: 'rgb(var(--leaf-700) / <alpha-value>)' },
        sky: { 400: '#4fc3f7', 500: '#1cb0f6', 600: '#1899d6' },
        coral: { 100: '#ffe1e1', 400: '#ff7a7a', 500: '#ff4b4b', 600: '#d93a3a' },
        sun: { 100: '#fff4cc', 400: '#ffd84d', 500: '#ffc800', 600: '#e5a800' },
        grape: { 400: '#d08cff', 500: '#ce82ff', 600: '#a560e8' },
        ink: { 300: 'rgb(var(--ink-300) / <alpha-value>)', 400: 'rgb(var(--ink-400) / <alpha-value>)', 500: 'rgb(var(--ink-500) / <alpha-value>)', 700: 'rgb(var(--ink-700) / <alpha-value>)' },
        cloud: 'rgb(var(--cloud) / <alpha-value>)',
        mist: 'rgb(var(--mist) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(0.8)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        bounceSoft: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-6px)' }, '75%': { transform: 'translateX(6px)' } },
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
      },
      animation: {
        pop: 'pop 0.25s ease-out',
        bounceSoft: 'bounceSoft 1.6s ease-in-out infinite',
        shake: 'shake 0.3s ease-in-out',
        slideUp: 'slideUp 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
