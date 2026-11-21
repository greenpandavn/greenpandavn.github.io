// Builds scripts/hsk<N>.txt from the themed word files in scripts/src/hsk<N>/*.txt.
// Source line: theme|hanzi[=pinyin]|nghĩa|token/token/…|nghĩa câu ví dụ   (themes: see THEMES)
// Usage: node scripts/group-level.mjs 4
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const THEMES = {
  p: ['Con người và xã hội', 'Con người, nghề nghiệp, quan hệ', '人'],
  l: ['Đời sống hằng ngày', 'Đồ vật, ăn mặc, sức khỏe, mua sắm', '家'],
  w: ['Học tập và công việc', 'Trường lớp, công sở, truyền thông', '工'],
  e: ['Cảm xúc và tính cách', 'Tâm trạng, thái độ, phẩm chất', '心'],
  a: ['Hành động', 'Động từ thường dùng', '动'],
  d: ['Miêu tả', 'Tính chất, trạng thái', '好'],
  n: ['Thiên nhiên và nơi chốn', 'Địa điểm, động thực vật, thời tiết', '山'],
  t: ['Khái niệm', 'Danh từ trừu tượng', '理'],
  g: ['Từ nối và hư từ', 'Phó từ, liên từ, giới từ, lượng từ', '而'],
};
const PARTS = { 4: [41, 4, 'sun'], 5: [51, 8, 'coral'], 6: [61, 12, 'grape'] }; // first unit number, number of parts
const COLORS = ['leaf', 'sky', 'grape', 'sun', 'coral'];
const SIZE = 12;
const level = Number(process.argv[2]);
const src = path.join(dir, 'src', `hsk${level}`);
const byTheme = {};
for (const f of fs.readdirSync(src).sort())
  for (const [i, raw] of fs.readFileSync(path.join(src, f), 'utf8').split('\n').entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const k = line.indexOf('|');
    const theme = line.slice(0, k);
    if (!THEMES[theme] || line.split('|').length < 5) throw new Error(`${f}:${i + 1}: bad line: ${line}`);
    (byTheme[theme] ??= []).push(line.slice(k + 1));
  }
// lessons of SIZE words per theme; a short tail is spread over the previous lessons
const queues = Object.keys(THEMES).filter((t) => byTheme[t]).map((t) => {
  const words = byTheme[t];
  const n = Math.max(1, Math.round(words.length / SIZE));
  const lessons = Array.from({ length: n }, (_, k) => words.slice(Math.floor((k * words.length) / n), Math.floor(((k + 1) * words.length) / n)));
  return lessons.map((w, k) => ({ theme: t, no: k + 1, of: n, words: w }));
});
// interleave the themes so that every part mixes topics
const all = [];
const total = queues.reduce((n, q) => n + q.length, 0);
const taken = queues.map(() => 0);
while (all.length < total) {
  let best = -1;
  queues.forEach((q, i) => {
    if (taken[i] < q.length && (best < 0 || taken[i] / q.length < taken[best] / queues[best].length)) best = i;
  });
  all.push(queues[best][taken[best]++]);
}
const [firstUnit, nParts] = PARTS[level];
const out = [`# HSK ${level} (chuẩn HSK cũ; các từ đã học ở cấp dưới không lặp lại).`, `# TỆP TỰ SINH từ scripts/src/hsk${level}/*.txt bằng scripts/group-level.mjs — hãy sửa ở tệp nguồn.`, ''];
let n = 0;
for (let p = 0; p < nParts; p++) {
  const part = all.slice(Math.floor((p * all.length) / nParts), Math.floor(((p + 1) * all.length) / nParts));
  const words = part.reduce((s, l) => s + l.words.length, 0);
  out.push(`%${firstUnit + p}|${level}|Phần ${p + 1}: HSK ${level} – chặng ${p + 1}|${part.length} bài · ${words} từ|${COLORS[p % COLORS.length]}`);
  for (const l of part) {
    n++;
    const [title, desc] = THEMES[l.theme];
    const icon = [...l.words[0].split('|')[0].split('=')[0]][0];
    out.push(`@h${level}-${String(n).padStart(2, '0')}|${title}${l.of > 1 ? ` ${l.no}` : ''}|${desc}|${icon}`, ...l.words, '');
  }
}
fs.writeFileSync(path.join(dir, `hsk${level}.txt`), out.join('\n'));
console.log(`HSK ${level}: ${n} lessons, ${all.reduce((s, l) => s + l.words.length, 0)} words, ${nParts} parts`);
