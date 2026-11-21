// Cross-checks every pinyin in src/data/lessons.json against pinyin-pro.
import fs from 'node:fs';
import { pinyin } from 'pinyin-pro';

const { lessons } = JSON.parse(fs.readFileSync(new URL('../src/data/lessons.json', import.meta.url)));
const norm = (s) => s.toLowerCase().replace(/[\s'’,.?!]/g, '');
// strip tone marks (used to detect neutral-tone / sandhi-only differences)
const bare = (s) => norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ü/g, 'v');
let hard = 0;
let soft = 0;
const check = (zh, mine, where) => {
  const ref = pinyin(zh, { toneType: 'symbol', type: 'array' }).join('');
  if (norm(ref) === norm(mine)) return;
  if (bare(ref) !== bare(mine)) {
    hard++;
    console.log(`SYLLABLE MISMATCH ${where}: ${zh} mine=${mine} ref=${ref}`);
  } else {
    soft++;
    console.log(`tone diff ${where}: ${zh} mine=${mine} ref=${ref}`);
  }
};
for (const l of lessons)
  for (const w of l.words) {
    check(w.hanzi, w.pinyin, `${l.id} word`);
    w.ex.tokens.forEach((t, i) => {
      if (!/[，。？！]/.test(t)) check(t, w.ex.py[i], `${l.id} ex(${w.hanzi})`);
    });
  }
console.log(`hard: ${hard}, tone diffs to review: ${soft}`);
