// Generates src/data/zh/ and src/data/en/ (meta.json + one u<unit>.json per part, see writeCourse), and copies the
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
// HSK 8: the next 1,800 words by frequency from the same list
Object.assign(ref, JSON.parse(read('scripts/ref/hsk8.json')));
// HSK 9: the remaining 450 words of the list
Object.assign(ref, JSON.parse(read('scripts/ref/hsk9.json')));
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
const EN_FILES = ['english.txt', 'english-beginner2.txt', 'english-intermediate2.txt', 'english-advanced.txt', 'english-proficient.txt', 'english-beginner3.txt', 'english-intermediate3.txt', 'english-advanced2.txt', 'english-proficient2.txt', 'english-mastery.txt', 'english-extra.txt'];
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
  // parts are numbered through the whole course (the source files number them per file, which repeated "Phần 5–8")
  enUnits.forEach((u, i) => (u.title = `Phần ${i + 1}: ${u.title.replace(/^Phần \d+:\s*/, '')}`));
  // lessons that share a name are numbered in course order, so no two lessons have the same title
  const base = (t) => t.replace(/\s+\d+$/, '');
  const groups = new Map();
  for (const l of enLessons) groups.set(base(l.title), [...(groups.get(base(l.title)) ?? []), l]);
  for (const [name, ls] of groups) if (ls.length > 1) ls.forEach((l, i) => (l.title = `${name} ${i + 1}`));
  const titles = new Set();
  for (const l of enLessons) {
    if (titles.has(l.title)) errors.push(`english: duplicate lesson title ${l.title}`);
    titles.add(l.title);
  }
  for (const level of new Set(lv.values())) {
    const ls = enLessons.filter((l) => lv.get(l.unit) === level);
    console.log(`English level ${level}: ${ls.length} lessons, ${ls.reduce((n, l) => n + l.words.length, 0)} words`);
  }
}

/* ---------------- Korean and Japanese ---------------- */
// scripts/korean.txt and scripts/japanese.txt use the unit/lesson lines of the compact format and
//   word|nghĩa|câu ví dụ (từ cách nhau bằng dấu cách)|nghĩa câu ví dụ
// Korean: the romanization (Revised Romanization, as pronounced) is derived from the Hangul.
// Japanese: a word or token with kanji is written kanji:kana (学校:がっこう); romaji is derived from the kana.
const K_INIT = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const K_MED = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
// finals: [sound at the end of a syllable, what stays before a vowel, what moves to the next syllable before a vowel]
const K_FIN = [
  ['', '', ''], ['k', '', 'g'], ['k', '', 'kk'], ['k', 'k', 's'], ['n', '', 'n'], ['n', 'n', 'j'], ['n', '', 'n'], ['t', '', 'd'], ['l', '', 'r'],
  ['k', 'l', 'g'], ['m', 'l', 'm'], ['l', 'l', 'b'], ['l', 'l', 's'], ['l', 'l', 't'], ['p', 'l', 'p'], ['l', '', 'r'], ['m', '', 'm'], ['p', '', 'b'],
  ['p', 'p', 's'], ['t', '', 's'], ['t', '', 'ss'], ['ng', 'ng', ''], ['t', '', 'j'], ['t', '', 'ch'], ['k', '', 'k'], ['t', '', 't'], ['p', '', 'p'], ['t', '', ''],
];
function romanizeKo(text) {
  const syl = [...text].map((ch) => {
    const c = ch.charCodeAt(0) - 0xac00;
    return c < 0 || c > 11171 ? { raw: ch } : { i: Math.floor(c / 588), m: Math.floor((c % 588) / 28), f: c % 28 };
  });
  let out = '';
  syl.forEach((s, k) => {
    if (s.raw !== undefined) return void (out += s.raw);
    const next = syl[k + 1] && syl[k + 1].raw === undefined ? syl[k + 1] : null;
    const prev = syl[k - 1] && syl[k - 1].raw === undefined ? syl[k - 1] : null;
    // initial
    let init = K_INIT[s.i];
    if (prev && prev.f) {
      const pf = K_FIN[prev.f][0];
      if (s.i === 11) init = ''; // the previous final was carried over (see below)
      else if (s.i === 5) init = pf === 'l' || pf === 'n' ? 'l' : 'n'; // ㄹ after a consonant
      else if (s.i === 2 && pf === 'l') init = 'l'; // ㄹ + ㄴ sounds ll
      else if (s.i === 18 && ['k', 't', 'p'].includes(pf)) init = ''; // ㅎ merges into the previous stop
      else if ([27, 6, 15].includes(prev.f) && [0, 3, 12].includes(s.i)) init = { 0: 'k', 3: 't', 12: 'ch' }[s.i]; // ㅎ + ㄱㄷㅈ
    } else if (s.i === 5 && !prev) init = 'r';
    out += init + K_MED[s.m];
    // final
    if (!s.f) return;
    const [end, stay, move] = K_FIN[s.f];
    if (next && next.i === 11) {
      // liaison; ㄷ/ㅌ + 이 becomes j/ch
      const palatal = next.m === 20 && (s.f === 7 || s.f === 25);
      out += stay + (palatal ? (s.f === 7 ? 'j' : 'ch') : move);
    } else if (next && (next.i === 2 || next.i === 6)) out += { k: 'ng', t: 'n', p: 'm' }[end] ?? end; // nasalization
    else if (next && next.i === 5) out += end === 'n' || end === 'l' ? 'l' : ({ k: 'ng', t: 'n', p: 'm' }[end] ?? end);
    else if (next && next.i === 18 && ['k', 't', 'p'].includes(end)) out += end === 't' && [22].includes(s.f) ? 'ch' : end;
    else if (next && [27, 6, 15].includes(s.f)) out += s.f === 27 ? '' : s.f === 6 ? 'n' : 'l'; // ㅎ is not heard
    else out += end;
  });
  return out;
}
const KANA = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko', さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to', な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo', ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go', ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo', だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo', ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po', ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
};
const YOON = { ゃ: 'a', ゅ: 'u', ょ: 'o' };
const toHira = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const JA_PARTICLE = { は: 'wa', へ: 'e', を: 'o', こんにちは: 'konnichiwa', こんばんは: 'konbanwa', では: 'dewa', には: 'niwa' };
function romanizeJa(kana, particle = true) {
  if (particle && JA_PARTICLE[kana]) return JA_PARTICLE[kana];
  const h = [...toHira(kana)];
  let out = '';
  for (let k = 0; k < h.length; k++) {
    const c = h[k];
    if (c === 'っ') {
      const n = KANA[h[k + 1]];
      out += n ? (n.startsWith('ch') ? 't' : n[0]) : '';
    } else if (c === 'ー') out += out.slice(-1);
    else if (YOON[h[k + 1]] && KANA[c]) {
      const base = KANA[c];
      out += (/^(sh|ch|j)/.test(base) ? base.slice(0, -1) : base.slice(0, -1) + 'y') + YOON[h[k + 1]];
      k++;
    } else if (c === 'ん') out += /^[aiueoy]/.test(KANA[h[k + 1]] ?? '') ? "n'" : 'n';
    else if (KANA[c]) out += KANA[c];
    else out += c;
  }
  return out;
}
// words per level after the extra themes (v5.5.0: 5,000 words per course)
const EXTRA_QUOTA = { ko: [834, 834, 833, 833, 833, 833], ja: [1000, 1000, 1000, 1000, 1000], th: [1000, 1000, 1000, 1000, 1000] };
/* ---------------- Thai (v5.6.0) ---------------- */
// The whole course is in scripts/th-extra/*.txt (same theme format as the Korean/Japanese extras). Thai spelling
// does not show syllable breaks or inherent vowels, so the romanization (RTGS, the Royal Thai General System:
// no tone marks, no vowel length) is written once per word, คำ:kham, as the headword of a line, inside an
// example, or in scripts/thai-dict.txt. Every later use of the same Thai word takes that romanization, so a
// word cannot have two different romanizations in the course.
const TH_DICT = new Map();
const thDefine = (surface, roman, where) => {
  const old = TH_DICT.get(surface);
  if (old && old !== roman) errors.push(`${where}: ${surface} is romanized "${roman}" here and "${old}" elsewhere`);
  else TH_DICT.set(surface, roman);
};
{
  const files = [['scripts/thai-dict.txt', true]];
  const dir = path.join(root, 'scripts/th-extra');
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.txt')).sort()) files.push([`scripts/th-extra/${f}`, false]);
  for (const [f, dict] of files) {
    if (!fs.existsSync(path.join(root, f))) continue;
    for (const [i, raw] of read(f).split('\n').entries()) {
      const line = raw.trim();
      if (!line || /^[#=@]/.test(line)) continue;
      const fields = line.split('|');
      const tokens = dict ? line.split(/\s+/) : [fields[0], ...(fields[2] ?? '').split(/\s+/)];
      for (const t of tokens) {
        const [surface, roman] = t.split(':');
        if (roman) thDefine(surface, roman, `${f.replace('scripts/', '')}:${i + 1}`);
      }
    }
  }
}
const romanizeTh = (surface) => TH_DICT.get(surface) ?? '';
const srcOf = {};
const SCRIPT_PUNCT = /^[。、？！,.?!]$/;
function scriptCourse(file, course, romanize) {
  const allMode = process.env.KJ_ALL === '1' || process.env.KJ_ALL === course;
  const cUnits = [];
  const cLessons = [];
  const cSeen = new Set();
  let unit = null;
  let lesson = null;
  // a token as written in the source -> [surface, romanization]
  const token = (t, where) => {
    if (SCRIPT_PUNCT.test(t)) return [t, { '。': '.', '、': ',', '？': '?', '！': '!' }[t] ?? t];
    const [surface, reading] = t.split(':');
    if (course === 'th') {
      if (!/^[\u0e01-\u0e3a\u0e40-\u0e4e]+$/.test(surface) && !/^[0-9]+$/.test(surface)) errors.push(`${where}: unexpected characters in ${surface}`);
      const roman = /^[0-9]+$/.test(surface) ? surface : romanize(surface);
      if (!roman) errors.push(`${where}: no romanization for ${surface}`);
      else if (!/^[0-9]+$/.test(surface) && !/^[a-z]+(-[a-z]+)*$/.test(roman)) errors.push(`${where}: romanization "${roman}" of ${surface} must be lower-case a–z only`);
      return [surface, roman];
    }
    if (course === 'ja') {
      if (/\p{Script=Han}/u.test(surface) && !reading) errors.push(`${where}: no reading for ${surface}`);
      if (reading && !/^[\u3040-\u30ffー]+$/.test(reading)) errors.push(`${where}: reading of ${surface} is not kana`);
      if (!/^[\u3040-\u30ffー\p{Script=Han}々0-9A-Za-z]+$/u.test(surface)) errors.push(`${where}: unexpected characters in ${surface}`);
    } else if (!/^[\uac00-\ud7a30-9A-Za-z]+$/.test(surface)) errors.push(`${where}: unexpected characters in ${surface}`);
    return [surface, romanize(reading ?? surface, !reading)]; // は, へ, を written alone are particles
  };
  const addWord = (line, where, lesson) => {
    const [w, vi, sentence, exVi] = line.split('|');
    if (!exVi) return void errors.push(`${where}: missing fields`);
    const [word, py] = token(w, where);
    if (cSeen.has(word)) errors.push(`${where}: duplicate word ${word}`);
    cSeen.add(word);
    const parts = sentence
      .split(/\s+/)
      .flatMap((t) => {
        const m = t.match(/^(.*?)([。、？！,.?!]*)$/);
        return [m[1], ...m[2]].filter(Boolean);
      })
      .map((t) => token(t, where));
    if (course !== 'th' && !SCRIPT_PUNCT.test(parts[parts.length - 1][0])) errors.push(`${where}: example has no final punctuation`);
    if (parts.filter((t) => !SCRIPT_PUNCT.test(t[0])).length < 2) errors.push(`${where}: example is too short`);
    lesson.words.push({ id: `${lesson.id}-${word}`, hanzi: word, pinyin: py, vi, ex: { tokens: parts.map((t) => t[0]), py: parts.map((t) => t[1]), vi: exVi, alts: [] } });
    srcOf[`${course} ${lesson.id} ${word}`] = where;
  };
  for (const [i, raw] of (course === 'th' ? '' : read(`scripts/${file}`)).split('\n').entries()) {
    const line = raw.trim();
    const where = `${file}:${i + 1}`;
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('%')) {
      const [u, level, title, desc, color] = line.slice(1).split('|');
      unit = { unit: Number(u), level: Number(level), title, desc, color, course };
      cUnits.push(unit);
      continue;
    }
    if (line.startsWith('@')) {
      const [id, title, desc, icon] = line.slice(1).split('|');
      lesson = { id, title, desc, icon, unit: unit.unit, course, words: [] };
      cLessons.push(lesson);
      continue;
    }
    addWord(line, where, lesson);
  }
  // v5.5.0 – scripts/<course>-extra/*.txt bring every level up to its quota of words. Format:
  //   =<level>            the level of the themes that follow
  //   @Tên chủ đề|mô tả   a theme; its words are cut into lessons of 12
  //   word lines as in the main file
  // Words of a theme that do not fill a lesson go to "Tổng hợp" lessons of the level. The new lessons of a level
  // form parts 4–9 of that level. With KJ_ALL=1 the quota is ignored (used with check-data --prune).
  const extraDir = path.join(root, 'scripts', `${course}-extra`);
  const byLevel = new Map();
  if (fs.existsSync(extraDir)) {
    let level = 0;
    let theme = null;
    for (const f of fs.readdirSync(extraDir).filter((x) => x.endsWith('.txt')).sort()) {
      for (const [i, raw] of read(`scripts/${course}-extra/${f}`).split('\n').entries()) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        if (line.startsWith('=')) {
          level = Number(line.slice(1));
          theme = null;
        } else if (line.startsWith('@')) {
          const [title, desc] = line.slice(1).split('|');
          theme = { title, desc: desc ?? title, words: [] };
          if (!byLevel.has(level)) byLevel.set(level, []);
          byLevel.get(level).push(theme);
        } else if (theme) theme.words.push([line, `${course}-extra/${f}:${i + 1}`]);
        else errors.push(`${course}-extra/${f}:${i + 1}: word before a theme`);
      }
    }
  }
  const COLORS = ['sun', 'leaf', 'sky', 'grape', 'rose', 'sun'];
  for (const [level, themes] of [...byLevel].sort((a, b) => a[0] - b[0])) {
    const base = cUnits.filter((u) => u.level === level).map((u) => u.unit);
    const have = cLessons.filter((l) => base.includes(l.unit)).reduce((n, l) => n + l.words.length, 0);
    let room = allMode ? Infinity : (EXTRA_QUOTA[course]?.[level - 1] ?? 0) - have;
    const made = [];
    const spare = [];
    for (const t of themes) {
      const ws = t.words.slice(0, Math.max(0, room));
      room -= ws.length;
      const k = Math.floor(ws.length / 12);
      for (let j = 0; j < k; j++) made.push({ title: k > 1 ? `${t.title} ${j + 1}` : t.title, desc: t.desc, words: ws.slice(j * 12, j * 12 + 12) });
      spare.push(...ws.slice(k * 12));
    }
    const m = Math.floor(spare.length / 12);
    for (let j = 0; j < m; j++) made.push({ title: `Tổng hợp ${j + 1}`, desc: 'Từ vựng tổng hợp của cấp này', words: spare.slice(j * 12, j * 12 + 12) });
    const rest = spare.slice(m * 12); // fewer than 12 words: one more word for each of the last lessons
    if (allMode && rest.length) made.push({ title: 'Còn lại', desc: '', words: rest });
    else rest.forEach((w, j) => made[made.length - 1 - j]?.words.push(w));
    if (rest.length > made.length && !allMode) errors.push(`${course} level ${level}: ${rest.length - made.length} extra words do not fit`);
    // Thai has no hand-written parts: its lessons form parts 1–9 of each level
    const nParts = base.length ? 6 : 9;
    const per = Math.ceil(made.length / nParts);
    const first = base.length ? Math.max(...base) + 1 : level === 1 ? 1 : level * 10 + 1;
    made.forEach((l, j) => {
      const part = Math.floor(j / per);
      if (j % per === 0) {
        const titles = [...new Set(made.slice(j, j + per).map((x) => x.title.replace(/ \d+$/, '')))];
        cUnits.push({ unit: first + part, level, title: `Phần ${(base.length ? 4 : 1) + part}: ${titles[0]} và hơn thế`, desc: titles.slice(0, 5).join(', '), color: COLORS[part % COLORS.length], course });
      }
      const lesson = { id: `${course}${level}x${String(j + 1).padStart(2, '0')}`, title: l.title, desc: l.desc, icon: [...l.words[0][0].split('|')[0].split(':')[0]][0], unit: first + part, course, words: [] };
      cLessons.push(lesson);
      for (const [line, where] of l.words) addWord(line, where, lesson);
    });
  }
  cUnits.sort((a, b) => a.unit - b.unit);
  const pos = new Map(cLessons.map((l, i) => [l, i]));
  cLessons.sort((a, b) => a.unit - b.unit || pos.get(a) - pos.get(b));
  const ids = new Set();
  for (const l of cLessons) {
    if (ids.has(l.id)) errors.push(`${file}: duplicate lesson id ${l.id}`);
    ids.add(l.id);
    if ((l.words.length < 10 || l.words.length > 14) && !allMode) errors.push(`${file}: lesson ${l.id} has ${l.words.length} words (expected 10–14)`);
  }
  for (const level of new Set(cUnits.map((u) => u.level))) {
    const us = new Set(cUnits.filter((u) => u.level === level).map((u) => u.unit));
    const ls = cLessons.filter((l) => us.has(l.unit));
    console.log(`${file} level ${level}: ${ls.length} lessons, ${ls.reduce((n, l) => n + l.words.length, 0)} words`);
  }
  return { units: cUnits, lessons: cLessons };
}
const ko = scriptCourse('korean.txt', 'ko', romanizeKo);
const ja = scriptCourse('japanese.txt', 'ja', romanizeJa);
const th = scriptCourse('thai', 'th', romanizeTh);
if (process.argv.includes('--roman')) for (const c of [ko, ja, th]) for (const l of c.lessons) for (const w of l.words) console.log(`${w.hanzi}\t${w.pinyin}\t${w.ex.py.join(' ')}`);

fs.writeFileSync(path.join(root, 'scripts/.kj-src.json'), JSON.stringify(srcOf));
if (process.env.KJ_ALL) {
  // candidate lines the builder rejects (duplicates, bad readings…) are removed from the extra files
  // Thai tokens without a romanization are listed, never pruned: add them to scripts/thai-dict.txt
  const missing = [...new Set(errors.filter((e) => /no romanization for/.test(e)).map((e) => e.split('no romanization for ')[1]))];
  if (missing.length) {
    console.error(`missing romanization (${missing.length}): ${missing.join(' ')}`);
    process.exit(3);
  }
  const mine = errors.filter((e) => /^(ko|ja|th)-extra\/[^:]+:\d+:/.test(e));
  const byFile = new Map();
  for (const e of mine) {
    const [f, n] = e.split(':');
    byFile.set(f, [...(byFile.get(f) ?? []), Number(n)]);
  }
  for (const [f, ns] of byFile) {
    const file = path.join(root, 'scripts', f);
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').split('\n').filter((_, i) => !ns.includes(i + 1)).join('\n'));
  }
  if (mine.length) {
    console.error(mine.join('\n'));
    console.error(`removed ${new Set(mine.map((e) => e.split(':').slice(0, 2).join(':'))).size} rejected candidate line(s); run again`);
    process.exit(2);
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
// Each course is written as:
//  - meta.json: the units and, per lesson, only what the lesson path shows (no description, no words) – small,
//    bundled with the app;
//  - u<unit>.json: the full lessons of one part, downloaded when a lesson of that part is opened.
// `order` keeps the position of a lesson in the whole course.
function writeCourse(dir, courseUnits, courseLessons) {
  const out = path.join(root, 'src/data', dir);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const ordered = courseLessons.map((l, i) => ({ ...l, order: (i + 1) * 10 }));
  for (const u of courseUnits) fs.writeFileSync(path.join(out, `u${u.unit}.json`), dump({ units: [u], lessons: ordered.filter((l) => l.unit === u.unit) }));
  const orphans = ordered.filter((l) => !courseUnits.some((u) => u.unit === l.unit));
  if (orphans.length) throw new Error(`lessons without a unit: ${orphans.map((l) => l.id).join(' ')}`);
  // a lesson in meta.json: [id, title, icon, unit, word count, cost of a bonus lesson]; its order is its position
  const extra = ordered.flatMap((l) => Object.keys(l).filter((k) => !['id', 'title', 'desc', 'icon', 'unit', 'order', 'words', 'course', 'bonus', 'cost'].includes(k)));
  if (extra.length) throw new Error(`meta.json does not keep these lesson fields: ${[...new Set(extra)].join(' ')}`);
  const rows = ordered.map((l) => `  ${JSON.stringify([l.id, l.title, l.icon, l.unit, l.words.length, ...(l.bonus ? [l.cost ?? 0] : [])])}`);
  fs.writeFileSync(
    path.join(out, 'meta.json'),
    `{\n "units": [\n${courseUnits.map((u) => `  ${JSON.stringify(u)}`).join(',\n')}\n ],\n "lessons": [\n${rows.join(',\n')}\n ]\n}\n`,
  );
}
writeCourse('zh', units, lessons);
writeCourse('en', enUnits, enLessons);
writeCourse('ko', ko.units, ko.lessons);
writeCourse('ja', ja.units, ja.lessons);
writeCourse('th', th.units, th.lessons);
fs.rmSync(path.join(root, 'src/data/english.json'), { force: true });

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
