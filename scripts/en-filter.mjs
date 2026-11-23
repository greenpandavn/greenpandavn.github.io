// Helper for writing new English vocabulary: prints the candidate words that are not in the course yet.
//   node scripts/en-filter.mjs <<< "theme: word, word, ..."      (one theme per line)
// A word counts as present when it matches an existing word after folding case, spaces, hyphens and plural endings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
export const fold = (s) => s.toLowerCase().replace(/[\s\-'’.]/g, '');
export const singular = (s) => (/(ches|shes|sses|xes|zes)$/.test(s) ? s.slice(0, -2) : /ies$/.test(s) && s.length > 4 ? s.slice(0, -3) + 'y' : /[^su]s$/.test(s) && s.length > 3 ? s.slice(0, -1) : s);
export const key = (w) => singular(fold(w));

export function existing(skipGenerated = true) {
  const seen = new Set();
  const files = fs.readdirSync(dir).filter((f) => /^english.*\.txt$/.test(f) && !(skipGenerated && f === 'english-extra.txt'));
  for (const f of files) for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) if (line && !/^[#%@]/.test(line)) seen.add(key(line.split('|')[0]));
  return seen;
}
export function pool() {
  const out = [];
  const d = path.join(dir, 'en-extra');
  for (const f of fs.readdirSync(d).filter((f) => f.endsWith('.txt')).sort()) {
    let theme = null;
    for (const [i, raw] of fs.readFileSync(path.join(d, f), 'utf8').split('\n').entries()) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.startsWith('@')) {
        const [level, title, desc, icon] = line.slice(1).split('|');
        theme = { level: Number(level), title, desc, icon, words: [], where: `${f}:${i + 1}` };
        out.push(theme);
      } else theme.words.push({ line, word: line.split('|')[0], where: `${f}:${i + 1}` });
    }
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const seen = existing();
  for (const t of pool()) for (const w of t.words) seen.add(key(w.word));
  let kept = 0;
  for (const line of fs.readFileSync(0, 'utf8').split('\n').filter(Boolean)) {
    const [head, list] = line.split(':');
    const ok = [];
    for (const w of list.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (seen.has(key(w))) continue;
      seen.add(key(w));
      ok.push(w);
    }
    kept += ok.length;
    console.log(`${head} (${ok.length}): ${ok.join(', ')}`);
  }
  console.error(`${kept} new`);
}
