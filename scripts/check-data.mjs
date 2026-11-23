// Checks the generated Korean / Japanese / English vocabulary (run after scripts/build-data.mjs):
//   node scripts/check-data.mjs
// Korean, Japanese: every word has its own romanization and meaning, its example contains the word,
//   no two words share a romanization (except the real homophones listed below) or a meaning.
// English: no two entries are the same word written differently (case, hyphen/space, singular/plural).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allow = JSON.parse(fs.readFileSync(path.join(root, 'scripts/check-allow.json'), 'utf8'));
const load = (c) =>
  fs
    .readdirSync(path.join(root, 'src/data', c))
    .filter((f) => /^u\d+\.json$/.test(f))
    .sort((a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)))
    .flatMap((f) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', c, f), 'utf8')).lessons)
    .flatMap((l) => l.words.map((w) => ({ ...w, lesson: l.id })));
const errors = [];
const groups = (ws, key) => {
  const m = new Map();
  for (const w of ws) {
    const k = key(w);
    if (k) m.set(k, [...(m.get(k) ?? []), w]);
  }
  return [...m].filter(([, v]) => new Set(v.map((w) => w.hanzi)).size > 1);
};
const pairKey = (v) => [...new Set(v.map((w) => w.hanzi))].sort().join(' = ');

for (const c of ['ko', 'ja']) {
  const ws = load(c);
  const okSurface = c === 'ko' ? /^[\uac00-\ud7a3]+$/ : /^[\u3040-\u30ffー\p{Script=Han}々]+$/u;
  let n = 0;
  for (const w of ws) {
    n++;
    const at = `${c} ${w.lesson} ${w.hanzi}`;
    if (!okSurface.test(w.hanzi)) errors.push(`${at}: unexpected characters`);
    if (!/^[a-z']+$/.test(w.pinyin)) errors.push(`${at}: romanization "${w.pinyin}" is not plain Latin`);
    if (!w.vi || /[\uac00-\ud7a3\u3040-\u30ff\p{Script=Han}]/u.test(w.vi)) errors.push(`${at}: bad meaning "${w.vi}"`);
    if (w.id !== `${w.lesson}-${w.hanzi}`) errors.push(`${at}: id ${w.id} does not belong to the word`);
    if (w.ex.tokens.length !== w.ex.py.length) errors.push(`${at}: example tokens and romanization differ in length`);
    // the example must use the word itself: the whole word, or (for words that conjugate) its stem
    const text = w.ex.tokens.join('');
    const syl = (ch) => Math.floor((ch.charCodeAt(0) - 0xac00) / 588); // initial consonant of a Hangul syllable
    let found = text.includes(w.hanzi);
    if (!found && c === 'ko' && w.hanzi.endsWith('다') && w.hanzi.length > 1) {
      // a verb or adjective conjugates: its stem is kept, only the last syllable of the stem may change (가다 → 갑니다, 춥다 → 추워요)
      const stem = w.hanzi.slice(0, -1);
      const head = stem.slice(0, -1);
      for (let i = 0; i + head.length < text.length && !found; i++) {
        const ch = text[i + head.length];
        found = text.startsWith(head, i) && ch >= '가' && ch <= '힣' && syl(ch) === syl(stem[stem.length - 1]);
      }
      // 르 verbs double the ㄹ (고르다 → 골랐습니다)
      if (!found && stem.endsWith('르') && stem.length > 1) {
        const before = stem[stem.length - 2];
        const withL = String.fromCharCode(before.charCodeAt(0) - ((before.charCodeAt(0) - 0xac00) % 28) + 8);
        found = text.includes(stem.slice(0, -2) + withL);
      }
    }
    if (!found && c === 'ja') found = text.includes(w.hanzi.replace(/[\u3040-\u309f]+$/, '') || w.hanzi);
    if (!found && !(allow.example[c] ?? []).includes(w.hanzi)) errors.push(`${at}: the example does not contain the word`);
    // the romanization of the word must be found in the romanized example when the word appears unchanged
    const i = w.ex.tokens.indexOf(w.hanzi);
    if (i >= 0 && w.ex.py[i] !== w.pinyin && !(c === 'ja' && ['は', 'へ'].includes(w.hanzi))) errors.push(`${at}: romanization "${w.pinyin}" differs from the example's "${w.ex.py[i]}"`);
  }
  for (const [k, v] of groups(ws, (w) => w.pinyin)) if (!allow.homophones[c].includes(pairKey(v))) errors.push(`${c}: same romanization "${k}": ${pairKey(v)}`);
  for (const [k, v] of groups(ws, (w) => w.vi.toLowerCase())) if (!allow.synonyms[c].includes(pairKey(v))) errors.push(`${c}: same meaning "${k}": ${pairKey(v)}`);
  for (const [, v] of groups(ws, () => 'x').slice(0, 0)) void v;
  const dup = ws.map((w) => w.hanzi).filter((h, i, a) => a.indexOf(h) !== i);
  if (dup.length) errors.push(`${c}: duplicate words ${dup.join(', ')}`);
  console.log(`${c}: ${n} words checked`);
}

// English
{
  const ws = load('en');
  const fold = (s) => s.toLowerCase().replace(/[\s\-'’.]/g, '');
  const singular = (s) => (/(ches|shes|sses|xes|zes)$/.test(s) ? s.slice(0, -2) : /ies$/.test(s) && s.length > 4 ? s.slice(0, -3) + 'y' : /[^su]s$/.test(s) && s.length > 3 ? s.slice(0, -1) : s);
  for (const [k, v] of groups(ws, (w) => fold(w.hanzi))) if (!allow.en.includes(pairKey(v))) errors.push(`en: same word written twice "${k}": ${pairKey(v)}`);
  for (const [k, v] of groups(ws, (w) => singular(fold(w.hanzi)))) {
    if (new Set(v.map((w) => fold(w.hanzi))).size > 1 && !allow.en.includes(pairKey(v))) errors.push(`en: singular/plural of one word "${k}": ${pairKey(v)}`);
  }
  const seen = new Map();
  for (const w of ws) {
    if (seen.has(w.hanzi)) errors.push(`en: duplicate word ${w.hanzi} (${seen.get(w.hanzi)}, ${w.lesson})`);
    seen.set(w.hanzi, w.lesson);
    if (!w.vi) errors.push(`en ${w.lesson} ${w.hanzi}: no meaning`);
    const text = w.ex.tokens.join(' ').toLowerCase();
    const head = w.hanzi.toLowerCase().split(/[\s-]/)[0].slice(0, Math.max(2, Math.min(4, w.hanzi.length - 2)));
    if (!text.includes(head) && !allow.example.en.includes(w.hanzi)) errors.push(`en ${w.lesson} ${w.hanzi}: the example does not contain the word`);
  }
  console.log(`en: ${ws.length} words checked`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log('data check passed');
