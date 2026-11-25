import { useState } from 'react';
import { COURSES, courseUnits, levelLabel } from '../data';
import * as api from '../lib/admin';
import { defaultPartVip, partVip, setVipParts, useVipParts, vipOverrides, withPartVip, type VipParts } from '../lib/vip';
import type { CourseId } from '../types';

/** Admin tab "VIP từng phần": one switch per part of every course, saved to config/vipParts and live for all learners. */
export default function VipPartsEditor({ by }: { by: string }) {
  useVipParts();
  const [open, setOpen] = useState<CourseId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const parts = vipOverrides();

  const save = async (next: VipParts) => {
    const before = parts;
    setBusy(true);
    setError('');
    setVipParts(next); // shown at once; the snapshot listener confirms it
    try {
      await api.saveVipParts(next, by);
    } catch (e) {
      setVipParts(before);
      const code = (e as { code?: string }).code ?? 'lỗi';
      setError(code === 'permission-denied' ? 'Không lưu được: cần đăng (publish) firestore.rules bản v5.6.0 có mục config/vipParts.' : `Không lưu được (${code}).`);
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-2" data-testid="admin-vip-parts">
      <p className="text-xs font-bold text-ink-400">
        Bật = Phần chỉ dành cho tài khoản VIP, Tắt = miễn phí. Thay đổi có hiệu lực ngay cho mọi người học. Đề thi thử của một cấp cần VIP khi cấp đó còn ít nhất một Phần VIP. Cổng đăng nhập từ Phần 3 không
        đổi.
      </p>
      {error && (
        <p className="rounded-xl bg-coral-100 p-2 text-sm font-bold text-coral-600" data-testid="vip-parts-error">
          {error}
        </p>
      )}
      {COURSES.map((c) => {
        const units = courseUnits(c.id);
        const on = units.filter((u) => partVip(c.id, u.unit)).length;
        const changed = Object.keys(parts[c.id] ?? {}).length;
        return (
          <div key={c.id} className="card !p-3" data-testid={`vip-parts-${c.id}`}>
            <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen(open === c.id ? null : c.id)} data-testid={`vip-parts-open-${c.id}`}>
              <span className="font-black">{c.label}</span>
              <span className="text-xs font-extrabold text-ink-400" data-testid={`vip-parts-count-${c.id}`}>
                {on}/{units.length} Phần VIP{changed ? ` · ${changed} khác mặc định` : ''} {open === c.id ? '▲' : '▼'}
              </span>
            </button>
            {open === c.id && (
              <div className="mt-2 flex flex-col gap-1">
                {changed > 0 && (
                  <button
                    type="button"
                    className="chip self-start !py-1 !text-xs"
                    disabled={busy}
                    onClick={() => {
                      const next = { ...parts };
                      delete next[c.id];
                      void save(next);
                    }}
                    data-testid={`vip-parts-reset-${c.id}`}
                  >
                    Về mặc định
                  </button>
                )}
                {units.map((u, i) => {
                  const level = u.level ?? 1;
                  const vip = partVip(c.id, u.unit);
                  return (
                    <div key={u.unit}>
                      {(i === 0 || (units[i - 1].level ?? 1) !== level) && <div className="mt-2 text-xs font-black uppercase text-ink-400">{levelLabel(level, c.id)}</div>}
                      <label className="flex items-center justify-between gap-2 py-1 text-sm font-bold">
                        <span className="min-w-0 flex-1 truncate">
                          {u.title}
                          {vip !== defaultPartVip(c.id, u.unit) && <span className="ml-1 text-xs text-sun-600">(đã đổi)</span>}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={vip}
                          aria-label={`VIP ${levelLabel(level, c.id)} ${u.title}`}
                          disabled={busy}
                          onClick={() => void save(withPartVip(parts, c.id, u.unit, !vip))}
                          className={`relative h-7 w-[86px] shrink-0 rounded-full text-xs font-black text-white transition-colors ${vip ? 'bg-sun-500' : 'bg-ink-300'}`}
                          data-testid={`vip-part-${c.id}-${u.unit}`}
                        >
                          {vip ? 'VIP: Bật' : 'VIP: Tắt'}
                        </button>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
