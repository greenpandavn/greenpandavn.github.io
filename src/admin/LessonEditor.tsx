import { useState } from 'react';
import { LESSONS, UNITS, type RawLesson, type RawWord } from '../data';
import { saveLesson, saveUnit } from '../lib/admin';
import { Chevron } from '../components/Icons';
import type { Lesson } from '../types';

interface WordForm {
  id: string;
  hanzi: string;
  pinyin: string;
  vi: string;
  tokens: string;
  py: string;
  exVi: string;
  alts: string[];
}

const toForm = (w: RawWord): WordForm => ({
  id: w.id,
  hanzi: w.hanzi,
  pinyin: w.pinyin,
  vi: w.vi,
  tokens: w.ex.tokens.join(' '),
  py: w.ex.py.join(' | '),
  exVi: w.ex.vi,
  alts: w.ex.alts,
});
const blank = (): WordForm => ({ id: '', hanzi: '', pinyin: '', vi: '', tokens: '', py: '', exVi: '', alts: [] });
const split = (s: string, sep: RegExp) => s.split(sep).map((x) => x.trim()).filter(Boolean);

/** Form-based editor for one lesson and its words (stored in Firestore `lessons/{id}`). */
export default function LessonEditor({ lesson, onClose, onSaved }: { lesson: Lesson | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const nextUnit = Math.max(...UNITS.map((u) => u.unit), 0);
  const [meta, setMeta] = useState({
    id: lesson?.id ?? '',
    title: lesson?.title ?? '',
    desc: lesson?.desc ?? '',
    icon: lesson?.icon ?? '',
    unit: lesson?.unit ?? nextUnit,
    order: lesson?.order ?? LESSONS.filter((l) => l.unit === (lesson?.unit ?? nextUnit)).length + 1,
    bonus: lesson?.bonus ?? false,
    cost: lesson?.cost ?? 100,
  });
  const [words, setWords] = useState<WordForm[]>(() => (lesson ? lesson.words.map(toForm) : [blank()]));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isNew = !lesson;

  const setW = (i: number, patch: Partial<WordForm>) => setWords((ws) => ws.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  const save = async () => {
    const id = meta.id.trim();
    if (!/^[a-z0-9_-]{2,30}$/i.test(id)) return setError('Mã bài chỉ gồm chữ, số, "-" hoặc "_" (2–30 ký tự), ví dụ: h2-01.');
    if (isNew && LESSONS.some((l) => l.id === id)) return setError('Mã bài đã tồn tại.');
    if (!meta.title.trim()) return setError('Cần nhập tên bài.');
    const out: RawWord[] = [];
    for (const [i, w] of words.entries()) {
      if (!w.hanzi.trim() || !w.pinyin.trim() || !w.vi.trim()) return setError(`Từ #${i + 1}: cần chữ Hán, pinyin và nghĩa tiếng Việt.`);
      const tokens = split(w.tokens, /\s+/);
      const py = split(w.py, /\|/);
      if (!tokens.length || tokens.length !== py.length)
        return setError(`Từ #${i + 1}: câu ví dụ cần cùng số phần chữ Hán (cách nhau bằng dấu cách) và pinyin (cách nhau bằng "|").`);
      out.push({
        id: w.id || `${id}-${w.hanzi.trim()}`,
        hanzi: w.hanzi.trim(),
        pinyin: w.pinyin.trim(),
        vi: w.vi.trim(),
        ex: { tokens, py, vi: w.exVi.trim(), alts: w.alts },
      });
    }
    if (out.length < 4) return setError('Mỗi bài cần ít nhất 4 từ để tạo bài tập.');
    if (new Set(out.map((w) => w.id)).size !== out.length) return setError('Có từ bị trùng.');
    const doc: RawLesson = {
      id,
      title: meta.title.trim(),
      desc: meta.desc.trim(),
      icon: meta.icon.trim() || out[0].hanzi,
      unit: Number(meta.unit) || 1,
      order: Number(meta.order) || 1,
      words: out,
      ...(meta.bonus ? { bonus: true, cost: Number(meta.cost) || 0 } : {}),
    };
    setSaving(true);
    setError('');
    try {
      if (!UNITS.some((u) => u.unit === doc.unit))
        await saveUnit({ unit: doc.unit, title: `Phần ${doc.unit}`, desc: 'Nội dung mới', color: 'leaf' });
      await saveLesson(doc);
      await onSaved();
    } catch (e) {
      setError(`Lưu thất bại: ${(e as { code?: string }).code ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, el: React.ReactNode) => (
    <label className="block text-sm font-extrabold text-ink-500">
      {label}
      <div className="mt-1">{el}</div>
    </label>
  );

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-4" data-testid="lesson-editor">
      <button type="button" onClick={onClose} className="mb-2 flex items-center gap-1 font-extrabold text-ink-400">
        <Chevron dir="left" size={22} /> Quay lại
      </button>
      <h1 className="mb-3 text-2xl font-black">{isNew ? 'Thêm bài học' : `Sửa bài: ${lesson.title}`}</h1>
      <div className="card flex flex-col gap-3">
        {field('Mã bài', <input className="input" value={meta.id} disabled={!isNew} onChange={(e) => setMeta({ ...meta, id: e.target.value })} placeholder="vd: h2-01" data-testid="ed-id" />)}
        {field('Tên bài', <input className="input" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} data-testid="ed-title" />)}
        {field('Mô tả', <input className="input" value={meta.desc} onChange={(e) => setMeta({ ...meta, desc: e.target.value })} />)}
        <div className="grid grid-cols-3 gap-2">
          {field('Phần số', <input className="input" type="number" min={1} value={meta.unit} onChange={(e) => setMeta({ ...meta, unit: Number(e.target.value) })} data-testid="ed-unit" />)}
          {field('Thứ tự', <input className="input" type="number" min={1} value={meta.order} onChange={(e) => setMeta({ ...meta, order: Number(e.target.value) })} />)}
          {field('Ký hiệu', <input className="input font-han" value={meta.icon} onChange={(e) => setMeta({ ...meta, icon: e.target.value })} placeholder="vd: 书" />)}
        </div>
        <label className="flex items-center gap-2 text-sm font-extrabold text-ink-500">
          <input type="checkbox" checked={meta.bonus} onChange={(e) => setMeta({ ...meta, bonus: e.target.checked })} /> Bài thưởng (mở bằng đá quý)
          {meta.bonus && <input className="input !w-24" type="number" value={meta.cost} onChange={(e) => setMeta({ ...meta, cost: Number(e.target.value) })} />}
        </label>
      </div>

      <h2 className="mb-2 mt-5 text-lg font-black">Từ vựng ({words.length})</h2>
      {words.map((w, i) => (
        <div key={i} className="card mb-2 flex flex-col gap-2 !p-3" data-testid="ed-word">
          <div className="flex items-center justify-between">
            <span className="font-black">#{i + 1}</span>
            <span className="flex gap-1">
              <button type="button" className="chip !py-0.5 !text-xs" disabled={i === 0} onClick={() => setWords((ws) => { const c = [...ws]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })}>↑</button>
              <button type="button" className="chip !py-0.5 !text-xs !text-coral-500" onClick={() => setWords((ws) => ws.filter((_, j) => j !== i))}>Xóa từ</button>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input className="input font-han" placeholder="Chữ Hán" value={w.hanzi} onChange={(e) => setW(i, { hanzi: e.target.value })} />
            <input className="input" placeholder="pinyin" value={w.pinyin} onChange={(e) => setW(i, { pinyin: e.target.value })} />
            <input className="input" placeholder="Nghĩa" value={w.vi} onChange={(e) => setW(i, { vi: e.target.value })} />
          </div>
          <input className="input font-han" placeholder="Câu ví dụ, tách từ bằng dấu cách: 我 喜欢 猫 。" value={w.tokens} onChange={(e) => setW(i, { tokens: e.target.value })} />
          <input className="input" placeholder="Pinyin từng phần, cách nhau bằng |: wǒ | xǐhuan | māo | ." value={w.py} onChange={(e) => setW(i, { py: e.target.value })} />
          <input className="input" placeholder="Nghĩa câu ví dụ" value={w.exVi} onChange={(e) => setW(i, { exVi: e.target.value })} />
        </div>
      ))}
      <button type="button" className="chip w-full" onClick={() => setWords((ws) => [...ws, blank()])} data-testid="ed-add-word">
        + Thêm từ
      </button>
      {error && <p className="mt-3 rounded-xl bg-coral-100 p-3 text-sm font-bold text-coral-600" data-testid="ed-error">{error}</p>}
      <button type="button" className="btn-green mt-4 w-full" disabled={saving} onClick={save} data-testid="ed-save">
        {saving ? 'Đang lưu…' : 'Lưu bài học'}
      </button>
    </div>
  );
}
