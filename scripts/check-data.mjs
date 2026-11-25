// Checks the generated Korean / Japanese / Thai / English vocabulary (run after scripts/build-data.mjs):
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
// --prune: remove from scripts/<course>-extra the candidate words that fail a check (build with KJ_ALL=1 first)
const prune = process.argv.includes('--prune');
const bad = new Set();
const isExtra = (w) => /^(ko|ja|th)\dx/.test(w.lesson);
const drop = (w) => isExtra(w) && bad.add(`${w.id.slice(0, 2)} ${w.lesson} ${w.hanzi}`);
// of several words that collide, the first one of the main file (or else the first one) stays
const dropGroup = (v) => {
  const keep = v.find((w) => !isExtra(w)) ?? v[0];
  for (const w of v) if (w.hanzi !== keep.hanzi) drop(w);
};
const TOTAL = { ko: 5000, ja: 5000 };
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
    const before = errors.length;
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
    if (!w.ex.vi || /[\uac00-\ud7a3\u3040-\u30ff\p{Script=Han}]/u.test(w.ex.vi)) errors.push(`${at}: bad example translation`);
    if (errors.length > before) drop(w);
  }
  // Japanese: words written with different kanji but read alike (早い / 速い) are real homophones; a kana
  // spelling next to a kanji one (たぶん / 多分) is the same word twice and is still rejected.
  const realHomophones = (v) => c === 'ja' && v.every((w) => /\p{Script=Han}/u.test(w.hanzi));
  for (const [k, v] of groups(ws, (w) => w.pinyin)) if (!allow.homophones[c].includes(pairKey(v)) && !realHomophones(v)) {
    errors.push(`${c}: same romanization "${k}": ${pairKey(v)}`);
    dropGroup(v);
  }
  for (const [k, v] of groups(ws, (w) => w.vi.toLowerCase())) if (!allow.synonyms[c].includes(pairKey(v))) {
    errors.push(`${c}: same meaning "${k}": ${pairKey(v)}`);
    dropGroup(v);
  }
  for (const [, v] of groups(ws, () => 'x').slice(0, 0)) void v;
  const dup = ws.map((w) => w.hanzi).filter((h, i, a) => a.indexOf(h) !== i);
  if (dup.length) errors.push(`${c}: duplicate words ${dup.join(', ')}`);
  if (!prune && n !== TOTAL[c]) errors.push(`${c}: ${n} words, expected exactly ${TOTAL[c]}`);
  console.log(`${c}: ${n} words checked`);
}

// Thai (v5.6.0): exactly 5,000 words, 1,000 per level, lessons of 12 words (1,000 is not a multiple of 12, so
// exactly 4 lessons per level have 13), no word or meaning twice, every word in its own example, and the
// romanization must be RTGS (Royal Thai General System): plain a–z, no tone or length marks, RTGS spellings only.
{
  const c = 'th';
  const ws = load(c);
  const INITIAL = {};
  for (const [letters, r] of [['ก', 'k'], ['ขฃคฅฆ', 'kh'], ['ง', 'ng'], ['จฉชฌ', 'ch'], ['ซศษส', 's'], ['ญย', 'y'], ['ฎด', 'd'], ['ฏต', 't'], ['ฐฑฒถทธ', 'th'], ['ณน', 'n'], ['บ', 'b'], ['ป', 'p'], ['ผพภ', 'ph'], ['ฝฟ', 'f'], ['ม', 'm'], ['รฤ', 'r'], ['ลฬ', 'l'], ['ว', 'w'], ['หฮ', 'h'], ['อ', '']])
    for (const ch of letters) INITIAL[ch] = r;
  // what an RTGS romanization may start with, from the spelling of the word
  const initials = (word) => {
    const t = word.replace(/^[เแโใไ]/, '');
    const [a, b] = [t[0], t[1]];
    if (a === 'ห' && 'งญนมยรลว'.includes(b)) return [INITIAL[b], 'h']; // silent leading ห, or ห + its own vowel (โหระพา = horapha)
    if (a === 'อ' && b === 'ย') return ['y'];
    if (a === 'อ') return ['a', 'e', 'i', 'o', 'u'];
    if (a === 'ท' && b === 'ร') return ['s', 'th', 'thr', 'thor']; // ทราย = sai, โทร = tho
    if ('สศซจ'.includes(a) && b === 'ร') return [INITIAL[a]]; // สร้าง = sang, จริง = ching
    return [INITIAL[a]];
  };
  // a hyphen separates syllables where two vowels would otherwise run together (sa-at, phra-athit)
  const rtgs = (r) => /^[a-z]+(-[a-z]+)*$/.test(r) && r.split('-').every(rtgsPart);
  const rtgsPart = (r) =>
    /^[a-z]+$/.test(r) &&
    !/[jqvxz]/.test(r) && // not RTGS letters
    !/c(?!h)/.test(r) && !/(?<!n)g/.test(r) && // c only in ch, g only in ng
    !/aa|ee|ii|oo|uu/.test(r) && // RTGS does not mark vowel length
    !/[yw](?![aeiou])/.test(r) && // y and w are consonants only (ai, ao – never ay, aw)
    /([aeiou]|k|t|p|n|m|ng)$/.test(r) && // the only final sounds
    !/[bdfhlrs](?![aeiouhrlw])/.test(r.replace(/[ptkc]h/g, 'x')); // b d f h l r s never close a syllable
  const perLesson = new Map();
  for (const w of ws) {
    perLesson.set(w.lesson, (perLesson.get(w.lesson) ?? 0) + 1);
    const at = `${c} ${w.lesson} ${w.hanzi}`;
    const before = errors.length;
    if (!/^[\u0e01-\u0e3a\u0e40-\u0e4e]+$/.test(w.hanzi)) errors.push(`${at}: unexpected characters`);
    if (!allow.thRoman.includes(w.hanzi)) {
      if (!rtgs(w.pinyin)) errors.push(`${at}: romanization "${w.pinyin}" is not RTGS`);
      else if (!initials(w.hanzi).some((x) => x !== undefined && w.pinyin.startsWith(x) && (x !== 'k' || !w.pinyin.startsWith('kh')) && (x !== 't' || !w.pinyin.startsWith('th')) && (x !== 'p' || !w.pinyin.startsWith('ph')) && (x !== 'n' || !w.pinyin.startsWith('ng'))))
        errors.push(`${at}: romanization "${w.pinyin}" does not start with the sound of the first letter`);
    }
    for (const [i, t] of w.ex.tokens.entries()) if (!/^[0-9]+$/.test(t) && !rtgs(w.ex.py[i]) && !allow.thRoman.includes(t)) errors.push(`${at}: example romanization "${w.ex.py[i]}" of ${t} is not RTGS`);
    if (!w.vi || /[\u0e00-\u0e7f]/.test(w.vi)) errors.push(`${at}: bad meaning "${w.vi}"`);
    if (w.id !== `${w.lesson}-${w.hanzi}`) errors.push(`${at}: id ${w.id} does not belong to the word`);
    if (w.ex.tokens.length !== w.ex.py.length) errors.push(`${at}: example tokens and romanization differ in length`);
    if (w.ex.tokens.length < 2) errors.push(`${at}: example is too short`);
    if (!w.ex.tokens.join('').includes(w.hanzi) && !allow.example.th.includes(w.hanzi)) errors.push(`${at}: the example does not contain the word`);
    const i = w.ex.tokens.indexOf(w.hanzi);
    if (i >= 0 && w.ex.py[i] !== w.pinyin) errors.push(`${at}: romanization "${w.pinyin}" differs from the example's "${w.ex.py[i]}"`);
    if (!w.ex.vi || /[\u0e00-\u0e7f]/.test(w.ex.vi)) errors.push(`${at}: bad example translation`);
    if (errors.length > before) drop(w);
  }
  for (const [k, v] of groups(ws, (w) => w.vi.toLowerCase())) if (!allow.synonyms.th.includes(pairKey(v))) {
    errors.push(`${c}: same meaning "${k}": ${pairKey(v)}`);
    dropGroup(v);
  }
  const seen = new Set();
  for (const w of ws) {
    if (seen.has(w.hanzi)) {
      errors.push(`${c}: duplicate word ${w.hanzi} (${w.lesson})`);
      drop(w);
    }
    seen.add(w.hanzi);
  }
  if (!prune) {
    if (ws.length !== 5000) errors.push(`${c}: ${ws.length} words, expected exactly 5000`);
    for (let lv = 1; lv <= 5; lv++) {
      const n = ws.filter((w) => w.lesson.startsWith(`th${lv}x`)).length;
      if (n !== 1000) errors.push(`${c} level ${lv}: ${n} words, expected exactly 1000`);
      const sizes = [...perLesson].filter(([id]) => id.startsWith(`th${lv}x`)).map(([, k]) => k);
      const odd = sizes.filter((k) => k !== 12);
      if (odd.some((k) => k !== 13) || odd.length > 4) errors.push(`${c} level ${lv}: lessons must have 12 words (4 lessons of 13 make up 1,000); found sizes ${[...new Set(odd)].join(', ')} in ${odd.length} lessons`);
    }
  }
  // reported, not an error: RTGS has no tones or vowel length, so different Thai words can be written alike in Latin
  // letters; and a Vietnamese meaning that another course also teaches is expected (the same idea in another language).
  const homo = groups(ws, (w) => w.pinyin);
  const others = new Set(['ko', 'ja', 'en'].flatMap((x) => load(x).map((w) => w.vi.toLowerCase())));
  const shared = ws.filter((w) => others.has(w.vi.toLowerCase())).length;
  const otherWords = new Set(['ko', 'ja', 'en'].flatMap((x) => load(x).map((w) => w.hanzi)));
  const sameWord = ws.filter((w) => otherWords.has(w.hanzi)).length;
  console.log(`${c}: ${ws.length} words checked (${perLesson.size} lessons; ${homo.length} groups of different words with the same RTGS spelling; ${sameWord} words also in another course; ${shared} meanings also taught in another course)`);
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

if (prune) {
  const src = JSON.parse(fs.readFileSync(path.join(root, 'scripts/.kj-src.json'), 'utf8'));
  const byFile = new Map();
  for (const k of bad) {
    const [f, n] = src[k].split(':');
    byFile.set(f, [...(byFile.get(f) ?? []), Number(n)]);
  }
  for (const [f, ns] of byFile) {
    const file = path.join(root, 'scripts', f);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').split('\n').filter((_, i) => !ns.includes(i + 1)).join('\n'));
  }
  console.log(errors.filter((e) => !/expected exactly/.test(e)).join('\n'));
  console.log(`pruned ${bad.size} candidate word(s)`);
  process.exit(0);
}
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log('data check passed');
