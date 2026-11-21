import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the static build works on Vercel, GitHub Pages (sub-path) or any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
});
