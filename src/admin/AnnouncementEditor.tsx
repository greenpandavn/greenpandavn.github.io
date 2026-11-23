import { useState } from 'react';
import * as api from '../lib/admin';
import { currentAnnouncement, setRemoteAnnouncement } from '../lib/announcement';

/** Admin form for the "what's new" notice (Firestore site/announcement): learners see it once after each change. */
export default function AnnouncementEditor() {
  const [a, setA] = useState(() => currentAnnouncement());
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | string>('idle');
  const save = async () => {
    if (!a.title.trim() || !a.body.trim() || !a.version.trim()) return setState('Hãy nhập đủ tiêu đề, nội dung và số phiên bản.');
    setState('saving');
    try {
      await api.saveAnnouncement(a);
      setRemoteAnnouncement({ ...a, updatedAt: Date.now() });
      setState('saved');
    } catch (e) {
      setState(`Chưa lưu được (${(e as { code?: string }).code ?? 'lỗi'}). Hãy publish firestore.rules bản v5.2.8.`);
    }
  };
  return (
    <form
      className="card flex flex-col gap-2"
      data-testid="admin-announcement"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="font-extrabold">Bảng thông báo cập nhật</div>
      <p className="text-xs font-bold text-ink-400">Học viên thấy thông báo một lần sau mỗi lần bạn lưu. Mỗi dòng là một ý; dòng bắt đầu bằng “- ” hiện thành gạch đầu dòng.</p>
      <label className="text-xs font-extrabold text-ink-500">
        Số phiên bản
        <input className="input mt-1 !min-h-[40px]" value={a.version} maxLength={20} onChange={(e) => setA({ ...a, version: e.target.value })} data-testid="ann-version" />
      </label>
      <label className="text-xs font-extrabold text-ink-500">
        Tiêu đề
        <input className="input mt-1 !min-h-[40px]" value={a.title} maxLength={80} onChange={(e) => setA({ ...a, title: e.target.value })} data-testid="ann-title" />
      </label>
      <label className="text-xs font-extrabold text-ink-500">
        Nội dung
        <textarea className="input mt-1 min-h-[140px] py-2" value={a.body} maxLength={1500} onChange={(e) => setA({ ...a, body: e.target.value })} data-testid="ann-body" />
      </label>
      {state !== 'idle' && state !== 'saving' && (
        <p className={`text-sm font-bold ${state === 'saved' ? 'text-leaf-600' : 'text-coral-600'}`} data-testid="ann-status">
          {state === 'saved' ? 'Đã lưu. Học viên sẽ thấy thông báo mới khi mở app.' : state}
        </p>
      )}
      <button type="submit" className="btn-green" disabled={state === 'saving'} data-testid="ann-save">
        {state === 'saving' ? 'Đang lưu…' : 'Lưu thông báo'}
      </button>
    </form>
  );
}
