import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Inject the list of built files into dist/sw.js so the whole app (incl. lesson + stroke data) works offline. */
function swPrecache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sw-precache',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
      const files = walk(outDir)
        .map((f) => relative(outDir, f).split(sep).join('/'))
        .filter((f) => f !== 'sw.js' && !f.endsWith('.map'));
      const sw = join(outDir, 'sw.js');
      const src = readFileSync(sw, 'utf8')
        .replace('self.__PRECACHE__ || []', JSON.stringify(files))
        .replace('__BUILD_ID__', Date.now().toString(36));
      writeFileSync(sw, src);
    },
  };
}

// Relative base so the static build works on Vercel, GitHub Pages (sub-path) or any static host.
export default defineConfig({
  base: './',
  plugins: [react(), swPrecache()],
  build: { chunkSizeWarningLimit: 700 }, // firebase lives in its own lazily-loaded chunk
  test: { environment: 'node' },
} as never);
