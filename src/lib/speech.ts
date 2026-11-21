let zhVoice: SpeechSynthesisVoice | null = null;
let enVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function pickVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  voicesLoaded = true;
  const zh = voices.filter((v) => /^zh[-_]?(CN|Hans)?/i.test(v.lang) || /chinese|mandarin|普通话|中文/i.test(v.name));
  zhVoice =
    zh.find((v) => /zh[-_]CN/i.test(v.lang) && /google|xiaoxiao|yunxi|tingting|ting-ting/i.test(v.name)) ||
    zh.find((v) => /zh[-_]CN/i.test(v.lang)) ||
    zh.find((v) => !/HK|TW/i.test(v.lang)) ||
    zh[0] ||
    null;
  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  enVoice =
    en.find((v) => /en[-_]US/i.test(v.lang) && /google|samantha|aria|jenny/i.test(v.name)) ||
    en.find((v) => /en[-_]US/i.test(v.lang)) ||
    en.find((v) => /en[-_]GB/i.test(v.lang)) ||
    en[0] ||
    null;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export const hasChineseVoice = () => {
  if (!voicesLoaded) pickVoice();
  return !!zhVoice;
};
export const hasEnglishVoice = () => {
  if (!voicesLoaded) pickVoice();
  return !!enVoice;
};
/** Chinese text is spoken/recognised as zh-CN, everything else (the English course) as en-US. */
export const speechLang = (text: string): 'zh-CN' | 'en-US' => (/\p{Script=Han}/u.test(text) ? 'zh-CN' : 'en-US');

let rate = 0.8;
export function setSpeechRate(r: number) {
  rate = r;
}

/** Speak Chinese (zh-CN) or English (en-US) text with the browser's free Web Speech API. */
export function speak(text: string, opts: { slow?: boolean; onEnd?: () => void } = {}) {
  if (!ttsSupported()) {
    opts.onEnd?.();
    return;
  }
  if (!voicesLoaded) pickVoice();
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const lang = speechLang(text);
  const voice = lang === 'zh-CN' ? zhVoice : enVoice;
  u.lang = voice?.lang || lang;
  if (voice) u.voice = voice;
  u.rate = opts.slow ? Math.max(0.4, rate - 0.35) : rate;
  u.onend = () => opts.onEnd?.();
  u.onerror = (e) => {
    opts.onEnd?.();
    if (e.error !== 'interrupted' && e.error !== 'canceled') window.dispatchEvent(new CustomEvent('tts-error'));
  };
  // Chrome sometimes drops an utterance issued right after cancel()
  setTimeout(() => synth.speak(u), 30);
}

/**
 * Speak several English (en-US) sentences one after another, e.g. a TOEIC conversation.
 * One utterance per sentence, because some browsers cut a long utterance short.
 */
export function speakSeq(parts: string[], opts: { onEnd?: () => void } = {}) {
  if (!ttsSupported()) {
    opts.onEnd?.();
    return;
  }
  if (!voicesLoaded) pickVoice();
  const synth = window.speechSynthesis;
  synth.cancel();
  const list = parts.flatMap((p) => p.match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g) ?? []).map((x) => x.trim()).filter(Boolean);
  const utterances = list.map((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = enVoice?.lang || 'en-US';
    if (enVoice) u.voice = enVoice;
    u.rate = Math.max(rate, 0.9);
    if (i === list.length - 1) u.onend = () => opts.onEnd?.();
    u.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      opts.onEnd?.();
      window.dispatchEvent(new CustomEvent('tts-error'));
    };
    return u;
  });
  if (!utterances.length) opts.onEnd?.();
  setTimeout(() => utterances.forEach((u) => synth.speak(u)), 30);
}
/** Stop whatever is being spoken. */
export const stopSpeaking = () => {
  if (ttsSupported()) window.speechSynthesis.cancel();
};

// ---- Speech recognition (best effort) ----
type Rec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecCtor(): (new () => Rec) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => Rec) | null;
}

export const recognitionSupported = () => typeof window !== 'undefined' && !!getRecCtor();

/** Listen once in the given language; resolves with candidate transcripts. */
export function listenOnce(lang: 'zh-CN' | 'en-US' = 'zh-CN'): { promise: Promise<string[]>; stop: () => void } {
  const Ctor = getRecCtor();
  if (!Ctor) return { promise: Promise.reject(new Error('unsupported')), stop: () => {} };
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  const promise = new Promise<string[]>((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const alts: string[] = [];
      const first = e.results[0];
      for (let i = 0; i < first.length; i++) alts.push(first[i].transcript);
      resolve(alts);
    };
    rec.onerror = (e) => {
      done = true;
      reject(new Error(e.error));
    };
    rec.onend = () => {
      if (!done) resolve([]);
    };
  });
  rec.start();
  return { promise, stop: () => rec.stop() };
}
