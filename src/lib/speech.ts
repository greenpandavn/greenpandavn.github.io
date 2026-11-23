import { unsupportedBrowser } from './browser';

let zhVoice: SpeechSynthesisVoice | null = null;
let enVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;

function pickVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  voicesLoaded = true;
  const zh = voices.filter(
    (v) =>
      /^zh[-_]?(CN|Hans)?/i.test(v.lang) ||
      /chinese|mandarin|普通话|中文/i.test(v.name),
  );
  zhVoice =
    zh.find(
      (v) =>
        /zh[-_]CN/i.test(v.lang) &&
        /google|xiaoxiao|yunxi|tingting|ting-ting/i.test(v.name),
    ) ||
    zh.find((v) => /zh[-_]CN/i.test(v.lang)) ||
    zh.find((v) => !/HK|TW/i.test(v.lang)) ||
    zh[0] ||
    null;
  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  enVoice =
    en.find(
      (v) =>
        /en[-_]US/i.test(v.lang) && /google|samantha|aria|jenny/i.test(v.name),
    ) ||
    en.find((v) => /en[-_]US/i.test(v.lang)) ||
    en.find((v) => /en[-_]GB/i.test(v.lang)) ||
    en[0] ||
    null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

export const ttsSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;
export const hasChineseVoice = () => {
  if (!voicesLoaded) pickVoice();
  return !!zhVoice;
};
export const hasEnglishVoice = () => {
  if (!voicesLoaded) pickVoice();
  return !!enVoice;
};
/** Chinese text is spoken/recognised as zh-CN, everything else (the English course) as en-US. */
export const speechLang = (text: string): "zh-CN" | "en-US" =>
  /\p{Script=Han}/u.test(text) ? "zh-CN" : "en-US";

let rate = 0.8;
export function setSpeechRate(r: number) {
  rate = r;
}

/** Cốc Cốc (a Chromium browser popular in Vietnam) exposes speechSynthesis but often cannot speak. */
export const isCocCoc = () => typeof navigator !== 'undefined' && /coc_coc|coccoc/i.test(navigator.userAgent);

export const COC_COC_HINT = 'Trình duyệt Cốc Cốc không đọc được giọng. Hãy mở app bằng Chrome để nghe phát âm.';

/** The voices the browser really offers for a course language (shown in the settings as a diagnostic). */
export function listVoices(lang: 'zh-CN' | 'en-US'): { name: string; lang: string }[] {
  if (!ttsSupported()) return [];
  const re = lang === 'zh-CN' ? /^(zh|cmn|yue)([-_]|$)/i : /^en([-_]|$)/i;
  return window.speechSynthesis
    .getVoices()
    .filter((v) => re.test(v.lang))
    .map((v) => ({ name: v.name, lang: v.lang }));
}

const VOICES_WAIT = 2000;
const START_WAIT = 4000;
let waitedForVoices = false;
/**
 * Android often returns no voices until "voiceschanged" fires: wait for it (once, at most ~2 s)
 * instead of speaking with no voice and failing straight away.
 */
function whenVoices(run: () => void) {
  if (!voicesLoaded) pickVoice();
  if (voicesLoaded || waitedForVoices) return run();
  const synth = window.speechSynthesis;
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    waitedForVoices = true;
    clearTimeout(timer);
    clearInterval(poll);
    synth.removeEventListener?.('voiceschanged', go);
    pickVoice();
    run();
  };
  const timer = setTimeout(go, VOICES_WAIT);
  // some engines never fire the event but fill the list a moment later
  const poll = setInterval(() => synth.getVoices().length && go(), 250);
  synth.addEventListener?.('voiceschanged', go);
}

/** Fired when a requested sound could not be played (after the retries). */
const ttsFailed = () => window.dispatchEvent(new CustomEvent('tts-error'));
const stopped = (e: SpeechSynthesisErrorEvent) => e.error === 'interrupted' || e.error === 'canceled';
/** Only the latest speak()/speakSeq() call may talk or report errors. */
let job = 0;

/**
 * In Cốc Cốc and in-app browsers an empty voice list (after the wait) means there will be no sound:
 * say so at once instead of after the retries, which take several seconds on a silent engine.
 */
function warnEarly(id: number) {
  if (id === job && unsupportedBrowser() && !window.speechSynthesis.getVoices().length) ttsFailed();
}

/**
 * Queue utterances for one job. If one fails (an error, or nothing starts within a few seconds),
 * the rest is tried once more with only the language set – some engines reject a chosen voice –
 * and only when that fails too is "tts-error" fired.
 */
function run(id: number, texts: string[], lang: 'zh-CN' | 'en-US', speed: number, onEnd?: () => void, plain = false) {
  if (id !== job) return;
  if (!texts.length) return onEnd?.();
  const synth = window.speechSynthesis;
  const voice = plain ? null : lang === 'zh-CN' ? zhVoice : enVoice;
  let over = false;
  let started = false;
  const fail = (from: number) => {
    if (over || id !== job) return;
    over = true;
    clearTimeout(watchdog);
    synth.cancel();
    if (!plain) return void setTimeout(() => run(id, texts.slice(from), lang, speed, onEnd, true), 80);
    onEnd?.();
    ttsFailed();
  };
  const utterances = texts.map((text, i) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voice?.lang || lang;
    if (voice) u.voice = voice;
    u.rate = speed;
    u.onstart = () => {
      started = true;
    };
    if (i === texts.length - 1)
      u.onend = () => {
        clearTimeout(watchdog);
        if (!over && id === job) onEnd?.();
      };
    u.onerror = (e) => {
      if (over || id !== job) return;
      if (stopped(e)) {
        over = true;
        clearTimeout(watchdog);
        return onEnd?.();
      }
      fail(i);
    };
    return u;
  });
  // an engine that stays silent without any event counts as a failure too
  const watchdog = setTimeout(() => !started && !synth.speaking && fail(0), START_WAIT);
  // Chrome sometimes drops an utterance issued right after cancel()
  setTimeout(() => id === job && !over && utterances.forEach((u) => synth.speak(u)), 30);
}

/** Speak Chinese (zh-CN) or English (en-US) text with the browser's free Web Speech API. */
export function speak(text: string, opts: { slow?: boolean; onEnd?: () => void } = {}) {
  if (!ttsSupported()) {
    opts.onEnd?.();
    ttsFailed();
    return;
  }
  const id = ++job;
  window.speechSynthesis.cancel();
  whenVoices(() => {
    warnEarly(id);
    const lang = speechLang(text);
    // a long English text (listening practice) goes sentence by sentence: some browsers cut a long utterance short
    const parts =
      lang === 'en-US' && text.length > 120
        ? (text.match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g) ?? [text]).map((x) => x.trim()).filter(Boolean)
        : [text];
    run(id, parts, lang, opts.slow ? Math.max(0.4, rate - 0.35) : rate, opts.onEnd);
  });
}

/**
 * Speak several English (en-US) sentences one after another, e.g. a TOEIC conversation.
 * One utterance per sentence, because some browsers cut a long utterance short.
 */
export function speakSeq(parts: string[], opts: { onEnd?: () => void } = {}) {
  if (!ttsSupported()) {
    opts.onEnd?.();
    ttsFailed();
    return;
  }
  const id = ++job;
  window.speechSynthesis.cancel();
  // titles such as "Mr." do not end a sentence
  const list = parts
    .flatMap((p) => p.replace(/\b(Mr|Mrs|Ms|Dr)\./g, '$1').match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g) ?? [])
    .map((x) => x.trim())
    .filter(Boolean);
  whenVoices(() => {
    warnEarly(id);
    run(id, list, 'en-US', Math.max(rate, 0.9), opts.onEnd);
  });
}
/** Stop whatever is being spoken. */
export const stopSpeaking = () => {
  job++;
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
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecCtor(): (new () => Rec) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as
    (new () => Rec) | null;
}

export const recognitionSupported = () =>
  typeof window !== "undefined" && !!getRecCtor();

/** Listen once in the given language; resolves with candidate transcripts. */
export function listenOnce(lang: "zh-CN" | "en-US" = "zh-CN"): {
  promise: Promise<string[]>;
  stop: () => void;
} {
  const Ctor = getRecCtor();
  if (!Ctor)
    return {
      promise: Promise.reject(new Error("unsupported")),
      stop: () => {},
    };
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
