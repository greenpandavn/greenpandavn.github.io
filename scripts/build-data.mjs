// Generates src/data/lessons.json (Chinese, HSK 1+) and src/data/english.json, and copies the
// HanziWriter stroke data needed by the Chinese course into public/hanzi/.
//
// Sources:
//   scripts/vocab.txt    HSK 1, explicit pinyin for every token (legacy format, see its header)
//   scripts/hsk<N>.txt   HSK 2+, compact format: pinyin is filled in from scripts/ref/hsk-old.json
//                        (old-HSK word list, MIT, github.com/clem109/hsk-vocabulary) and pinyin-pro
//   scripts/english.txt  beginner English course
//
// Compact format:
//   %unit|level|Tiêu đề phần|Mô tả|color
//   @lessonId|Tiêu đề|Mô tả|icon
//   hanzi[=pinyin]|nghĩa|token/token[=pinyin]/…|nghĩa câu ví dụ|thứ tự đúng khác (tùy chọn, tách bằng ;)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin as pinyinPro } from 'pinyin-pro';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const PUNCT = new Set(['，', '。', '？', '！', '、']);
const PY_PUNCT = new Set([',', '.', '?', '!']);
const PUNCT_PY = { '，': ',', '。': '.', '？': '?', '！': '!', '、': ',' };
const errors = [];
const warnings = [];

/* ---------------- HSK 1 (legacy, explicit pinyin) ---------------- */
const lessons = [];
const seen = new Map();
const tokenPy = new Map(); // token -> pinyin as written by hand in HSK 1
let current = null;
for (const [i, raw] of read('scripts/vocab.txt').split('\n').entries()) {
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
    errors.push(`vocab.txt:${i + 1}: missing fields`);
    continue;
  }
  const tokens = zhT.split('/');
  const py = pyT.split('/');
  if (tokens.length !== py.length) errors.push(`vocab.txt:${i + 1}: token count mismatch ${tokens.length} vs ${py.length}`);
  tokens.forEach((t, k) => {
    if (PUNCT.has(t) !== PY_PUNCT.has(py[k])) errors.push(`vocab.txt:${i + 1}: punctuation mismatch at ${k}`);
    if (!PUNCT.has(t) && !tokenPy.has(t)) tokenPy.set(t, py[k]);
  });
  if (!tokens.join('').includes(hanzi)) errors.push(`vocab.txt:${i + 1}: example does not contain ${hanzi}`);
  if (seen.has(hanzi)) errors.push(`vocab.txt:${i + 1}: duplicate word ${hanzi}`);
  seen.set(hanzi, 1);
  current.words.push({ id: `${current.id}-${hanzi}`, hanzi, pinyin, vi, ex: { tokens, py, vi: exVi, alts: alts ? alts.split(';') : [] } });
}
const units = [
  { unit: 1, level: 1, title: 'Phần 1: Làm quen', desc: 'Chào hỏi, giới thiệu, số đếm, gia đình', color: 'leaf' },
  { unit: 2, level: 1, title: 'Phần 2: Cuộc sống hằng ngày', desc: 'Ăn uống, màu sắc, thời gian, trường học', color: 'sky' },
  { unit: 3, level: 1, title: 'Phần 3: Khám phá thế giới', desc: 'Động vật, nhà cửa, du lịch, thời tiết', color: 'grape' },
];

/* ---------------- pinyin helpers ---------------- */
const ref = JSON.parse(read('scripts/ref/hsk-old.json'));
// HSK 7: the most frequent third of the HSK 3.0 level 7–9 list (MIT, github.com/drkameleon/complete-hsk-vocabulary)
Object.assign(ref, JSON.parse(read('scripts/ref/hsk7.json')));
const TONES = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' };
const toneOf = (syl) => {
  for (const ch of syl.toLowerCase()) for (const m of Object.values(TONES)) if (m.includes(ch)) return m.indexOf(ch) + 1;
  return 0;
};
const setTone = (syl, base, tone) => syl.replace(new RegExp(`[${TONES[base]}]`), TONES[base][tone - 1]);
/** 一 / 不 tone sandhi inside a word, then join the syllables (apostrophe before a/e/o). */
function joinSyllables(hanzi, syls) {
  const chars = [...hanzi];
  const s = [...syls];
  if (chars.length === s.length)
    chars.forEach((ch, k) => {
      const next = s[k + 1];
      if (!next) return;
      const nt = chars[k + 1] === '个' ? 4 : toneOf(next);
      if (ch === '不' && nt === 4) s[k] = setTone(s[k], 'u', 2);
      if (ch === '一' && k === 0 && chars[k + 1] !== '月' && chars[k + 1] !== '号') {
        if (nt === 4) s[k] = setTone(s[k], 'i', 2);
        else if (nt >= 1) s[k] = setTone(s[k], 'i', 4);
      }
    });
  return s.reduce((out, syl, k) => out + (k && /^[aāáǎàeēéěèoōóǒò]/i.test(syl) ? "'" : '') + syl, '').replace(/'?r$/, (m) => (m.length > 1 ? 'r' : m));
}
const refPy = new Map(); // hanzi -> pinyin (first reading listed)
const refLevel = new Map();
const ALIAS = { 为: '为什么', 踢: '踢足球', 电子: '电子邮件', 刷: '刷牙', 刮: '刮风' }; // the reference list shortens these official entries
for (const [lv, list] of Object.entries(ref))
  for (const [h, p] of list) {
    if (!refPy.has(h)) refPy.set(h, joinSyllables(h, p.split(' ')));
    if (!refLevel.has(h)) refLevel.set(h, Number(lv));
  }
const NAMES = {
  小王: 'Xiǎo Wáng', 小李: 'Xiǎo Lǐ', 小明: 'Xiǎo Míng', 小红: 'Xiǎo Hóng', 小张: 'Xiǎo Zhāng', 上海: 'Shànghǎi', 河内: 'Hénèi', 北京: 'Běijīng',
  中国: 'Zhōngguó', 越南: 'Yuènán', 中文: 'Zhōngwén', 汉语: 'Hànyǔ', 长城: 'Chángchéng', 黄河: 'Huáng Hé', 春节: 'Chūn Jié', 中秋节: 'Zhōngqiū Jié',
};
// Default reading of single-character tokens that have several readings.
const SINGLE = {
  得: 'de', 地: 'de', 的: 'de', 了: 'le', 着: 'zhe', 过: 'guo', 吗: 'ma', 呢: 'ne', 吧: 'ba', 啊: 'a', 个: 'ge', 还: 'hái', 长: 'cháng', 都: 'dōu',
  会: 'huì', 要: 'yào', 行: 'xíng', 为: 'wèi', 只: 'zhǐ', 给: 'gěi', 和: 'hé', 没: 'méi', 把: 'bǎ', 种: 'zhǒng', 便: 'biàn', 重: 'zhòng', 好: 'hǎo',
  教: 'jiāo', 发: 'fā', 少: 'shǎo', 干: 'gàn', 更: 'gèng', 看: 'kàn', 空: 'kōng', 相: 'xiāng', 中: 'zhōng', 大: 'dà', 上: 'shàng', 下: 'xià',
  几: 'jǐ', 分: 'fēn', 差: 'chà', 当: 'dāng', 倒: 'dào', 数: 'shǔ', 乐: 'lè', 觉: 'jiào', 那: 'nà', 哪: 'nǎ', 谁: 'shéi', 这: 'zhè', 场: 'chǎng', 被: 'bèi', 像: 'xiàng',
  背: 'bèi', 处: 'chù', 转: 'zhuǎn', 应: 'yīng', 弹: 'tán', 调: 'tiáo', 假: 'jià', 省: 'shěng', 占: 'zhàn', 落: 'luò', 血: 'xuè', 熟: 'shú', 薄: 'báo', 待: 'dāi',
};
const autoTokens = new Set();
const ownPy = new Map(); // words defined in compact files (incl. overrides)
function tokenPinyin(tokens, k, ctx) {
  const t = tokens[k];
  if (PUNCT.has(t)) return PUNCT_PY[t];
  if (/^[A-Za-z0-9]+$/.test(t)) return t;
  const next = tokens.slice(k + 1).find((x) => !PUNCT.has(x));
  if (t === '不' || t === '一') {
    const np = next && k + 1 < tokens.length && !PUNCT.has(tokens[k + 1]) ? ctx[k + 1] : '';
    const nt = !np ? 0 : tokens[k + 1].startsWith('个') ? 4 : toneOf(np);
    if (t === '不') return nt === 4 ? 'bú' : 'bù';
    return nt === 4 ? 'yí' : nt ? 'yì' : 'yī';
  }
  if (NAMES[t]) return NAMES[t];
  if (ownPy.has(t)) return ownPy.get(t);
  if (tokenPy.has(t)) return tokenPy.get(t);
  if ([...t].length === 1 && SINGLE[t]) return SINGLE[t];
  if (refPy.has(t)) return refPy.get(t);
  autoTokens.add(t);
  return joinSyllables(t, pinyinPro(t, { toneType: 'symbol', type: 'array' }));
}

/* ---------------- compact Chinese files (HSK 2+) ---------------- */
const levels = fs.readdirSync(path.join(root, 'scripts')).filter((f) => /^hsk\d\.txt$/.test(f)).sort();
const pending = [];
for (const file of levels) {
  let unit = null;
  for (const [i, raw] of read(`scripts/${file}`).split('\n').entries()) {
    const line = raw.trim();
    const where = `${file}:${i + 1}`;
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('%')) {
      const [u, level, title, desc, color] = line.slice(1).split('|');
      unit = { unit: Number(u), level: Number(level), title, desc, color };
      units.push(unit);
      continue;
    }
    if (line.startsWith('@')) {
      const [id, title, desc, icon] = line.slice(1).split('|');
      current = { id, title, desc, icon, unit: unit.unit, words: [] };
      lessons.push(current);
      continue;
    }
    const [head, vi, zhT, exVi, alts] = line.split('|');
    if (!exVi) {
      errors.push(`${where}: missing fields`);
      continue;
    }
    const [hanzi, pyOver] = head.split('=');
    if (seen.has(hanzi)) errors.push(`${where}: duplicate word ${hanzi}`);
    seen.set(hanzi, 1);
    const wordPy = pyOver || refPy.get(hanzi);
    if (!wordPy) errors.push(`${where}: no pinyin for ${hanzi}`);
    if (!ownPy.has(hanzi)) ownPy.set(hanzi, wordPy);
    const bare = (x) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f\s']/g, '');
    if (wordPy && bare(wordPy) !== bare(pinyinPro(hanzi, { toneType: 'symbol', type: 'array' }).join('')))
      warnings.push(`${where}: check pinyin of ${hanzi}: ${wordPy} (pinyin-pro: ${pinyinPro(hanzi)})`);
    const parts = zhT.split('/').map((t) => t.split('='));
    const tokens = parts.map((p) => p[0]);
    if (!tokens.join('').includes(hanzi)) errors.push(`${where}: example does not contain ${hanzi}`);
    if (!PUNCT.has(tokens[tokens.length - 1])) errors.push(`${where}: example has no final punctuation`);
    const word = { id: `${current.id}-${hanzi}`, hanzi, pinyin: wordPy, vi, ex: { tokens, py: [], vi: exVi, alts: alts ? alts.split(';') : [] } };
    current.words.push(word);
    pending.push({ word, parts });
  }
}
// second pass so that every word defined anywhere is known when sentences are transcribed
for (const { word, parts } of pending) {
  const tokens = word.ex.tokens;
  const py = new Array(tokens.length);
  for (let k = tokens.length - 1; k >= 0; k--) py[k] = parts[k][1] ?? tokenPinyin(tokens, k, py);
  word.ex.py = py;
}

/* ---------------- English ---------------- */
const enLessons = [];
const enUnits = [];
const enSeen = new Set();
// english.txt holds the original beginner + intermediate lessons; the other files add levels and extra parts
const EN_FILES = ['english.txt', 'english-beginner2.txt', 'english-intermediate2.txt', 'english-advanced.txt', 'english-proficient.txt'];
for (const file of EN_FILES.filter((f) => fs.existsSync(path.join(root, 'scripts', f)))) {
  let unit = null;
  for (const [i, raw] of read(`scripts/${file}`).split('\n').entries()) {
    const line = raw.trim();
    const where = `${file}:${i + 1}`;
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('%')) {
      const [u, level, title, desc, color] = line.slice(1).split('|');
      unit = { unit: Number(u), level: Number(level), title, desc, color, course: 'en' };
      enUnits.push(unit);
      continue;
    }
    if (line.startsWith('@')) {
      const [id, title, desc, icon] = line.slice(1).split('|');
      current = { id, title, desc, icon, unit: unit.unit, course: 'en', words: [] };
      enLessons.push(current);
      continue;
    }
    const [word, vi, sentence, exVi, alts] = line.split('|');
    if (!exVi) {
      errors.push(`${where}: missing fields`);
      continue;
    }
    // Proper nouns keep their case so that the month May does not clash with the modal may.
    const key = /^[A-Z][a-z]/.test(word) ? word : word.toLowerCase();
    if (enSeen.has(key)) errors.push(`${where}: duplicate word ${word}`);
    enSeen.add(key);
    const tokens = sentence.split(/\s+/).flatMap((t) => {
      const m = t.match(/^(.*?)([,.?!]*)$/);
      return [m[1], ...m[2]].filter(Boolean);
    });
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!` ${norm(sentence)} `.includes(` ${norm(word)} `)) errors.push(`${where}: example does not contain "${word}"`);
    if (!/[.?!]$/.test(sentence)) errors.push(`${where}: example has no final punctuation`);
    current.words.push({
      id: `${current.id}-${word.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      hanzi: word,
      pinyin: '',
      vi,
      ex: { tokens, py: tokens.map((t) => (/^[,.?!]$/.test(t) ? t : '')), vi: exVi, alts: alts ? alts.split(';') : [] },
    });
  }
}
{
  const ids = new Set();
  for (const l of enLessons) {
    if (ids.has(l.id)) errors.push(`english: duplicate lesson id ${l.id}`);
    ids.add(l.id);
    if (l.words.length < 12 || l.words.length > 14) errors.push(`english: lesson ${l.id} has ${l.words.length} words (expected 12–14)`);
  }
  const lv = new Map(enUnits.map((u) => [u.unit, u.level]));
  enUnits.sort((a, b) => a.level - b.level || a.unit - b.unit);
  const pos = new Map(enUnits.map((u, i) => [u.unit, i]));
  enLessons.sort((a, b) => pos.get(a.unit) - pos.get(b.unit));
  for (const level of new Set(lv.values())) {
    const ls = enLessons.filter((l) => lv.get(l.unit) === level);
    console.log(`English level ${level}: ${ls.length} lessons, ${ls.reduce((n, l) => n + l.words.length, 0)} words`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const dump = (obj) =>
  `{\n "units": [\n${obj.units.map((u) => `  ${JSON.stringify(u)}`).join(',\n')}\n ],\n "lessons": [\n${obj.lessons
    .map((l) => `  ${JSON.stringify({ ...l, words: undefined }).slice(0, -1)},"words":[\n${l.words.map((w) => `   ${JSON.stringify(w)}`).join(',\n')}\n  ]}`)
    .join(',\n')}\n ]\n}\n`;
fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/lessons.json'), dump({ units, lessons }));
fs.writeFileSync(path.join(root, 'src/data/english.json'), dump({ units: enUnits, lessons: enLessons }));

// Copy stroke-order data for every character used anywhere in the course.
const chars = new Set();
for (const l of lessons)
  for (const w of l.words) for (const ch of [...w.hanzi, ...w.ex.tokens.join('')]) if (/\p{Script=Han}/u.test(ch)) chars.add(ch);
const outDir = path.join(root, 'public/hanzi');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const dataDir = path.join(root, 'node_modules/hanzi-writer-data');
const missing = [];
for (const ch of chars) {
  const f = path.join(dataDir, `${ch}.json`);
  if (fs.existsSync(f)) fs.copyFileSync(f, path.join(outDir, `${ch}.json`));
  else missing.push(ch);
}

/* ---------------- report ---------------- */
const levelOf = new Map(units.map((u) => [u.unit, u.level]));
const byLevel = {};
for (const l of lessons) {
  const lv = levelOf.get(l.unit) ?? 1;
  byLevel[lv] ??= { lessons: 0, words: 0 };
  byLevel[lv].lessons++;
  byLevel[lv].words += l.words.length;
}
for (const [lv, s] of Object.entries(byLevel)) {
  const std = ref[lv].map((w) => w[0]);
  const notCovered = [...new Set(std)].filter((h) => !seen.has(h) && !seen.has(ALIAS[h]));
  console.log(`HSK ${lv}: ${s.lessons} lessons, ${s.words} words; standard-list words not in the course: ${notCovered.join(' ') || 'none'}`);
}
if (process.argv.includes('--auto')) console.log(`tokens transcribed by pinyin-pro (review): ${[...autoTokens].join(' ')}`);
if (warnings.length) console.log(warnings.join('\n'));
console.log(`Chinese: ${lessons.length} lessons, ${[...seen.keys()].length} words, ${chars.size} chars, missing stroke data: ${missing.join('') || 'none'}`);
console.log(`English: ${enLessons.length} lessons, ${enSeen.size} words`);
