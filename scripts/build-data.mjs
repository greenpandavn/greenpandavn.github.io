// Generates src/data/lessons.json from scripts/vocab.txt and copies the
// HanziWriter stroke data needed by the course into public/hanzi/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'scripts/vocab.txt'), 'utf8');
const PUNCT = new Set(['，', '。', '？', '！']);
const PY_PUNCT = new Set([',', '.', '?', '!']);

const lessons = [];
let current = null;
const errors = [];
const seen = new Map();

for (const [i, raw] of src.split('\n').entries()) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  if (line.startsWith('@')) {
    const [id, title, desc, icon, unit, cost] = line.slice(1).split('|');
    current = { id, title, desc, icon, unit: Number(unit), words: [] };
    if (cost) {
      current.bonus = true;
      current.cost = Number(cost);
    }
    lessons.push(current);
    continue;
  }
  const [hanzi, pinyin, vi, zhT, pyT, exVi, alts] = line.split('|');
  if (!exVi) {
    errors.push(`line ${i + 1}: missing fields`);
    continue;
  }
  const tokens = zhT.split('/');
  const py = pyT.split('/');
  if (tokens.length !== py.length) errors.push(`line ${i + 1}: token count mismatch ${tokens.length} vs ${py.length}`);
  tokens.forEach((t, k) => {
    if (PUNCT.has(t) !== PY_PUNCT.has(py[k])) errors.push(`line ${i + 1}: punctuation mismatch at ${k}`);
  });
  if (!tokens.join('').includes(hanzi)) errors.push(`line ${i + 1}: example does not contain ${hanzi}`);
  const id = `${current.id}-${hanzi}`;
  if (seen.has(hanzi)) errors.push(`line ${i + 1}: duplicate word ${hanzi}`);
  seen.set(hanzi, id);
  current.words.push({
    id,
    hanzi,
    pinyin,
    vi,
    ex: {
      tokens,
      py,
      vi: exVi,
      alts: alts ? alts.split(';') : [],
    },
  });
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/lessons.json'), JSON.stringify({ lessons }, null, 1));

// Copy stroke-order data for every character used anywhere in the course.
const chars = new Set();
for (const l of lessons)
  for (const w of l.words) for (const ch of [...w.hanzi, ...w.ex.tokens.join('')]) if (/\p{Script=Han}/u.test(ch)) chars.add(ch);
const outDir = path.join(root, 'public/hanzi');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const dataDir = path.join(root, 'node_modules/hanzi-writer-data');
let missing = [];
for (const ch of chars) {
  const f = path.join(dataDir, `${ch}.json`);
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(outDir, `${ch}.json`));
  else missing.push(ch);
}
const total = lessons.reduce((n, l) => n + l.words.length, 0);
console.log(`lessons: ${lessons.length}, words: ${total}, chars: ${chars.size}, missing stroke data: ${missing.join('') || 'none'}`);
