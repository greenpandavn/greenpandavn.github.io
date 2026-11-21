const TONE_MAP: Record<string, [string, number]> = {};
const groups: Record<string, string> = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', v: 'ǖǘǚǜ' };
for (const [base, marks] of Object.entries(groups)) [...marks].forEach((m, i) => (TONE_MAP[m] = [base, i + 1]));

function clean(s: string) {
  return s
    .toLowerCase()
    .normalize('NFC')
    .replace(/u:/g, 'v')
    .replace(/ü/g, 'v')
    .replace(/[\s'’`\-.,?!。，？！]/g, '');
}

/** Remove tone marks/digits: "nǐ hǎo" -> "nihao", "ni3hao3" -> "nihao". */
export function toneless(s: string) {
  return [...clean(s)]
    .map((c) => (TONE_MAP[c] ? TONE_MAP[c][0] : c))
    .join('')
    .replace(/[0-9]/g, '');
}

/** Sequence of tones (1-4) in order, neutral tones ignored. */
function toneSeq(s: string) {
  const c = clean(s);
  if (/[0-9]/.test(c)) return (c.match(/[1-4]/g) || []).join('');
  return [...c]
    .map((ch) => (TONE_MAP[ch] ? String(TONE_MAP[ch][1]) : ''))
    .join('');
}

export type PinyinResult = 'exact' | 'toneless' | 'wrong';

/**
 * Compare a typed answer to the expected pinyin.
 * Accepts tone marks (nǐ hǎo), tone numbers (ni3 hao3) or no tones (ni hao).
 */
export function checkPinyin(input: string, expected: string): PinyinResult {
  if (!input.trim()) return 'wrong';
  if (toneless(input) !== toneless(expected)) return 'wrong';
  const typed = toneSeq(input);
  if (!typed) return 'toneless';
  return typed === toneSeq(expected) ? 'exact' : 'wrong';
}

/** Convert "ni3" style syllables typed by the user into tone marks for display. */
export function numbersToMarks(input: string) {
  return input.replace(/([a-zü:v]+)([1-5])/gi, (_, syl: string, tone: string) => {
    let s = syl.replace(/u:|v/gi, 'ü');
    const t = Number(tone);
    if (t === 5) return s;
    const marks: Record<string, string> = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ' };
    const lower = s.toLowerCase();
    let idx = lower.search(/[ae]/);
    if (idx < 0) idx = lower.indexOf('ou');
    if (idx < 0) {
      for (let i = lower.length - 1; i >= 0; i--)
        if ('iouü'.includes(lower[i])) {
          idx = i;
          break;
        }
    }
    if (idx < 0) return s;
    const v = lower[idx];
    s = s.slice(0, idx) + marks[v][t - 1] + s.slice(idx + 1);
    return s;
  });
}
