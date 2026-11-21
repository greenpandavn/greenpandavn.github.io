let zhVoice: SpeechSynthesisVoice | null = null;
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

let rate = 0.8;
export function setSpeechRate(r: number) {
  rate = r;
}

/** Speak Chinese text with the browser's free Web Speech API. */
export function speak(text: string, opts: { slow?: boolean; onEnd?: () => void } = {}) {
  if (!ttsSupported()) {
    opts.onEnd?.();
    return;
  }
  if (!voicesLoaded) pickVoice();
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = zhVoice?.lang || 'zh-CN';
  if (zhVoice) u.voice = zhVoice;
  u.rate = opts.slow ? Math.max(0.4, rate - 0.35) : rate;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  // Chrome sometimes drops an utterance issued right after cancel()
  setTimeout(() => synth.speak(u), 30);
}

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

/** Listen once in zh-CN; resolves with candidate transcripts. */
export function listenOnce(): { promise: Promise<string[]>; stop: () => void } {
  const Ctor = getRecCtor();
  if (!Ctor) return { promise: Promise.reject(new Error('unsupported')), stop: () => {} };
  const rec = new Ctor();
  rec.lang = 'zh-CN';
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
