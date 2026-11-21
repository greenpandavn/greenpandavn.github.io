/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Nunito"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        han: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        leaf: { 50: '#effbe6', 100: '#d9f5c4', 400: '#7ed957', 500: '#58cc02', 600: '#46a302', 700: '#3b8a02' },
        sky: { 400: '#4fc3f7', 500: '#1cb0f6', 600: '#1899d6' },
        coral: { 100: '#ffe1e1', 400: '#ff7a7a', 500: '#ff4b4b', 600: '#d93a3a' },
        sun: { 100: '#fff4cc', 400: '#ffd84d', 500: '#ffc800', 600: '#e5a800' },
        grape: { 400: '#d08cff', 500: '#ce82ff', 600: '#a560e8' },
        ink: { 300: '#afafaf', 400: '#8a8a8a', 500: '#777777', 700: '#4b4b4b' },
        cloud: '#e5e5e5',
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
