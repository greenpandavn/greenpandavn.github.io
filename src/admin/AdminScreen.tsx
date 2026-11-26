import AnnouncementEditor from './AnnouncementEditor';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BUNDLED_LESSONS, isBundledLesson, LESSONS, LESSON_BY_ID, UNITS, loadCourse, useContentVersion } from '../data';
import { useAccount } from '../lib/account';
import { levelInfo } from '../lib/gamification';
import { currentStreak } from '../lib/gamification';
import * as api from '../lib/admin';
import { loadContent } from '../lib/cloud';
import { loadVisitStats, type VisitStats } from '../lib/visits';
import CertificateView from '../components/CertificateView';
import Footer from '../components/Footer';
import { Chevron } from '../components/Icons';
import LessonEditor from './LessonEditor';
import { endOfDay, extendVip, fmtVipDate } from '../lib/vip';
import type { Certificate } from '../types';
import VipPartsEditor from './VipPartsEditor';
import PaymentAdmin from './PaymentAdmin';

type Tab = 'stats' | 'users' | 'vip' | 'vipParts' | 'pay' | 'content' | 'certs' | 'reports';
const TABS: [Tab, string][] = [
  ['stats', 'Thống kê'],
  ['users', 'Người dùng'],
  ['vip', 'VIP'],
  ['vipParts', 'VIP từng phần'],
  ['pay', 'Thanh toán'],
  ['content', 'Nội dung'],
  ['certs', 'Chứng chỉ'],
  ['reports', 'Báo cáo'],
];
const fmtDate = (t: number) => (t ? new Date(t).toLocaleDateString('vi-VN') : '—');

export default function AdminScreen({ onClose }: { onClose: () => void }) {
  const acc = useAccount();
  const [tab, setTab] = useState<Tab>('stats');
  const [users, setUsers] = useState<api.AdminUser[] | null>(null);
  const [reports, setReports] = useState<api.Report[] | null>(null);
  const [reportsError, setReportsError] = useState('');
  const [visits, setVisits] = useState<VisitStats | null>(null);
  const [visitsError, setVisitsError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [q, setQ] = useState('');
  const [cert, setCert] = useState<Certificate | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // lesson id or 'new'
  useContentVersion();
  // the editor compares against the bundled Chinese lessons, whichever course is being studied
  useEffect(() => void loadCourse('zh').catch(() => {}), []);

  const reloadVisits = useCallback(
    () =>
      loadVisitStats()
        .then((v) => {
          setVisits(v);
          setVisitsError('');
        })
        .catch((e) => setVisitsError(`Không tải được thống kê truy cập (${(e as { code?: string }).code ?? 'lỗi'}). Hãy publish firestore.rules bản v5.1.`)),
    [],
  );
  const reload = () => {
    api
      .listReports()
      .then((r) => {
        setReports(r);
        setReportsError('');
      })
      .catch((e) => setReportsError(`Không tải được danh sách báo cáo (${(e as { code?: string }).code ?? 'lỗi'}). Hãy publish firestore.rules bản v4.`));
    return api
      .listUsers()
      .then((u) => {
        setUsers(u.sort((a, b) => (b.progress?.xp ?? 0) - (a.progress?.xp ?? 0)));
        setError('');
      })
      .catch((e) => setError(`Không tải được dữ liệu quản trị (${(e as { code?: string }).code ?? 'lỗi'}). Hãy kiểm tra firestore.rules đã được publish.`));
  };
  useEffect(() => {
    if (acc.role === 'admin') void reload();
  }, [acc.role]);
  // VIP can also change through payment confirmations, so refresh the list when the VIP tab opens
  useEffect(() => {
    if (acc.role === 'admin' && tab === 'vip') void reload();
  }, [acc.role, tab]);
  // keep the online count fresh while the statistics tab is open
  useEffect(() => {
    if (acc.role !== 'admin' || tab !== 'stats') return;
    void reloadVisits();
    const t = setInterval(() => void reloadVisits(), 60_000);
    return () => clearInterval(t);
  }, [acc.role, tab, reloadVisits]);

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      await reload();
    } catch (e) {
      setError(`Thao tác thất bại: ${(e as { code?: string }).code ?? e}`);
    } finally {
      setBusy('');
    }
  };

  const stats = useMemo(() => (users ? api.computeStats(users) : null), [users]);
  const now = Date.now();
  const vips = (users ?? []).filter((u) => u.vipUntil > now).sort((a, b) => a.vipUntil - b.vipUntil);
  const shown = (users ?? []).filter((u) => !q || `${u.displayName} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  if (acc.role !== 'admin')
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center" data-testid="admin-denied">
        <p className="font-extrabold text-ink-500">Bạn không có quyền truy cập trang quản trị.</p>
        <button type="button" className="btn-green mt-4" onClick={onClose}>
          Quay lại
        </button>
      </div>
    );

  if (editing)
    return (
      <LessonEditor
        lesson={editing === 'new' ? null : LESSON_BY_ID[editing]}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          await loadContent();
          setEditing(null);
        }}
      />
    );

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md px-4 pb-6 pt-4" data-testid="admin-screen">
      <button type="button" onClick={onClose} className="mb-2 flex items-center gap-1 font-extrabold text-ink-400">
        <Chevron dir="left" size={22} /> Quay lại
      </button>
      <h1 className="text-2xl font-black">Quản trị</h1>
      <p className="mb-3 text-sm font-bold text-ink-400">Đăng nhập với quyền admin: {acc.user?.email}</p>
      <div className="mb-4 grid grid-cols-3 gap-1">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className={`chip !px-0.5 !text-[11px] ${tab === id ? 'chip-active' : ''}`} onClick={() => setTab(id)} data-testid={`admin-tab-${id}`}>
            {label}
            {id === 'reports' && !!reports?.filter((r) => r.status === 'open').length && ` (${reports.filter((r) => r.status === 'open').length})`}
          </button>
        ))}
      </div>
      {error && <p className="mb-3 rounded-xl bg-coral-100 p-3 text-sm font-bold text-coral-600">{error}</p>}
      {busy && <p className="mb-3 text-sm font-bold text-sky-600">Đang xử lý: {busy}…</p>}
      {!users && !error && <p className="font-bold text-ink-400">Đang tải…</p>}

      {tab === 'stats' && stats && (
        <div className="flex flex-col gap-3" data-testid="admin-stats">
          <div className="card" data-testid="admin-visits">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-extrabold">Thống kê truy cập</div>
              <button type="button" className="chip !text-xs" onClick={() => void reloadVisits()} data-testid="admin-visits-refresh">
                Làm mới
              </button>
            </div>
            {visitsError ? (
              <p className="text-sm font-bold text-coral-600">{visitsError}</p>
            ) : !visits ? (
              <p className="text-sm font-bold text-ink-400">Đang tải…</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    [visits.online, 'Số người đang online', 'online'],
                    [visits.total, 'Tổng số lượt truy cập', 'total'],
                    [visits.today, 'Lượt truy cập hôm nay', 'today'],
                  ] as const
                ).map(([value, label, id]) => (
                  <div key={id}>
                    <div className="text-2xl font-black text-leaf-600" data-testid={`admin-visits-${id}`}>
                      {value.toLocaleString('vi-VN')}
                    </div>
                    <div className="text-xs font-bold text-ink-400">{label}</div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs font-bold text-ink-400">Tính cả khách chưa đăng nhập. “Đang online” = thiết bị có tín hiệu trong 5 phút gần nhất; tự cập nhật mỗi phút.</p>
          </div>
          <AnnouncementEditor />
          <div className="grid grid-cols-2 gap-3">
            <Stat value={stats.learners} label="Tổng học viên" />
            <Stat value={stats.dau} label="Hoạt động hôm nay" />
            <Stat value={stats.wau} label="Hoạt động 7 ngày" />
            <Stat value={stats.lessonsCompleted} label="Lượt hoàn thành bài" />
          </div>
          <div className="card">
            <div className="mb-2 font-extrabold">Bài khó nhất (tỉ lệ đạt thấp nhất)</div>
            {stats.hardest.length === 0 ? (
              <p className="text-sm font-bold text-ink-400">Chưa có dữ liệu.</p>
            ) : (
              <ol className="flex flex-col gap-1 text-sm font-bold">
                {stats.hardest.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2">
                    <span className="truncate">{LESSON_BY_ID[h.id]?.title ?? h.id}</span>
                    <span className="shrink-0 text-ink-400">
                      {Math.round(h.passRate * 100)}% · {h.completed} đạt / {h.fails} trượt
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="text-xs font-bold text-ink-400">Chỉ tính học viên đã đăng nhập (khách học trên máy, không gửi dữ liệu). Đã cấp {stats.certificates} chứng chỉ.</p>
        </div>
      )}

      {tab === 'users' && users && (
        <div className="flex flex-col gap-2" data-testid="admin-users">
          <input className="input" placeholder="Tìm theo tên hoặc email" value={q} onChange={(e) => setQ(e.target.value)} />
          {shown.map((u) => {
            const self = u.uid === acc.user?.uid;
            const p = u.progress;
            return (
              <div key={u.uid} className="card flex flex-col gap-2 !p-3" data-testid="admin-user">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-black">
                      {u.displayName} {u.role === 'admin' && <span className="rounded bg-grape-500 px-1.5 text-xs text-white">admin</span>}{' '}
                      {u.vipUntil > Date.now() && <span className="rounded bg-sun-400 px-1.5 text-xs text-white">VIP</span>}{' '}
                      {u.locked && <span className="rounded bg-coral-500 px-1.5 text-xs text-white">đã khóa</span>}{' '}
                      {u.hidden && <span className="rounded bg-ink-400 px-1.5 text-xs text-white">ẩn BXH</span>}
                    </div>
                    <div className="truncate text-xs font-bold text-ink-400">{u.email || '(không có email)'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center text-xs font-bold text-ink-500">
                  <span>Cấp {p ? levelInfo(p.xp).level : '—'}</span>
                  <span>{p?.xp ?? 0} XP</span>
                  <span>🔥 {p ? currentStreak(p) : 0}</span>
                  <span>{fmtDate(u.createdAt)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" disabled={self} className="chip !py-1 !text-xs" onClick={() => act('khóa/mở khóa', () => api.setLocked(u.uid, !u.locked))}>
                    {u.locked ? 'Mở khóa' : 'Khóa'}
                  </button>
                  <button type="button" disabled={self} className="chip !py-1 !text-xs" onClick={() => act('phân quyền', () => api.setRole(u.uid, u.role === 'admin' ? 'user' : 'admin'))}>
                    {u.role === 'admin' ? 'Thu hồi admin' : 'Cấp admin'}
                  </button>
                  <button
                    type="button"
                    className="chip !py-1 !text-xs"
                    onClick={() => {
                      const n = prompt('Tên hiển thị mới (để trống = bỏ tên bắt buộc):', u.forcedName || u.displayName);
                      if (n === null) return;
                      void act('đổi tên', () => (n.trim() ? api.renameUser(u.uid, n) : api.clearForcedName(u.uid)));
                    }}
                  >
                    Sửa tên
                  </button>
                  <button type="button" className="chip !py-1 !text-xs" onClick={() => act('bảng xếp hạng', () => api.setHidden(u.uid, !u.hidden))}>
                    {u.hidden ? 'Hiện lại trên BXH' : 'Xóa khỏi BXH'}
                  </button>
                </div>
              </div>
            );
          })}
          {shown.length === 0 && <p className="font-bold text-ink-400">Không có người dùng.</p>}
        </div>
      )}

      {tab === 'vipParts' && <VipPartsEditor by={acc.user?.email ?? ''} />}
      {tab === 'pay' && <PaymentAdmin by={acc.user?.email ?? ''} />}

      {tab === 'vip' && users && (
        <div className="flex flex-col gap-2" data-testid="admin-vip">
          <p className="text-xs font-bold text-ink-400">
            VIP mở các Phần đang bật VIP (xem tab “VIP từng phần”). Hết hạn thì tài khoản tự mất quyền VIP. Gia hạn được cộng tiếp vào ngày hết hạn hiện tại.
          </p>
          <h2 className="font-black">Đang là VIP ({vips.length})</h2>
          {vips.length === 0 && <p className="text-sm font-bold text-ink-400">Chưa có tài khoản VIP nào.</p>}
          {vips.map((u) => (
            <VipRow key={u.uid} u={u} now={now} onSet={(until) => act('VIP', () => api.setVip(u.uid, until, acc.user?.email ?? ''))} />
          ))}
          <h2 className="mt-3 font-black">Bật VIP cho tài khoản</h2>
          <input className="input" placeholder="Tìm theo tên hoặc email" value={q} onChange={(e) => setQ(e.target.value)} data-testid="vip-search" />
          {!q && <p className="text-sm font-bold text-ink-400">Nhập tên hoặc email để tìm tài khoản.</p>}
          {q &&
            shown
              .filter((u) => u.vipUntil <= now)
              .slice(0, 20)
              .map((u) => <VipRow key={u.uid} u={u} now={now} onSet={(until) => act('VIP', () => api.setVip(u.uid, until, acc.user?.email ?? ''))} />)}
          {q && shown.filter((u) => u.vipUntil <= now).length === 0 && <p className="text-sm font-bold text-ink-400">Không tìm thấy tài khoản chưa có VIP.</p>}
        </div>
      )}

      {tab === 'content' && (
        <div className="flex flex-col gap-2" data-testid="admin-content">
          <button type="button" className="btn-green" onClick={() => setEditing('new')} data-testid="admin-new-lesson">
            + Thêm bài học
          </button>
          <p className="text-xs font-bold text-ink-400">Nội dung lưu trên Firestore; bài không có bản sửa sẽ dùng nội dung gốc đi kèm ứng dụng.</p>
          {UNITS.map((un) => (
            <div key={un.unit}>
              <div className="mb-1 mt-2 flex items-center justify-between">
                <span className="font-black">{un.title}</span>
                <button
                  type="button"
                  className="text-xs font-extrabold text-sky-600 underline"
                  onClick={() => {
                    const title = prompt('Tên phần:', un.title);
                    if (!title) return;
                    const desc = prompt('Mô tả:', un.desc) ?? un.desc;
                    void act('lưu phần', async () => {
                      await api.saveUnit({ ...un, title, desc });
                      await loadContent();
                    });
                  }}
                >
                  Sửa tên phần
                </button>
              </div>
              {LESSONS.filter((l) => l.unit === un.unit).map((l) => {
                const edited = !isBundledLesson(l.id) ? 'mới' : '';
                return (
                  <div key={l.id} className="card mb-1.5 flex items-center gap-2 !p-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold">
                        {l.title} {l.bonus && '· thưởng'} {edited && <span className="text-leaf-600">· {edited}</span>}
                      </div>
                      <div className="text-xs font-bold text-ink-400">
                        {l.id} · {l.words.length} từ
                      </div>
                    </div>
                    <button type="button" className="chip !py-1 !text-xs" onClick={() => setEditing(l.id)} data-testid={`edit-${l.id}`}>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="chip !py-1 !text-xs !text-coral-500"
                      onClick={() => {
                        if (confirm(`Xóa bài "${l.title}"? Học viên sẽ không thấy bài này nữa.`))
                          void act('xóa bài', async () => {
                            await api.deleteLesson(l.id);
                            await loadContent();
                          });
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          <RestoreList onRestore={(id) => act('khôi phục', async () => { await api.restoreLesson(id); await loadContent(); })} />
        </div>
      )}

      {tab === 'certs' && users && (
        <div className="flex flex-col gap-2" data-testid="admin-certs">
          {users.flatMap((u) =>
            [...(u.progress?.certificates ?? [])].map((c) => {
              const key = api.certKey(c);
              const revoked = u.revoked.includes(key);
              return (
                <div key={u.uid + key} className="card flex items-center gap-2 !p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-extrabold">
                      {c.name} · {c.part}
                    </div>
                    <div className="text-xs font-bold text-ink-400">
                      {c.score}% · {c.date.split('-').reverse().join('/')} · {u.email}
                      {revoked && <span className="text-coral-500"> · đã thu hồi</span>}
                    </div>
                  </div>
                  <button type="button" className="chip !py-1 !text-xs" onClick={() => setCert(c)}>
                    Xem
                  </button>
                  <button
                    type="button"
                    className="chip !py-1 !text-xs !text-coral-500"
                    onClick={() => act(revoked ? 'khôi phục chứng chỉ' : 'thu hồi chứng chỉ', () => (revoked ? api.restoreCert(u.uid, key) : api.revokeCert(u.uid, key)))}
                  >
                    {revoked ? 'Khôi phục' : 'Thu hồi'}
                  </button>
                </div>
              );
            }),
          )}
          {users.every((u) => !u.progress?.certificates.length) && <p className="font-bold text-ink-400">Chưa có chứng chỉ nào được cấp.</p>}
          <p className="text-xs font-bold text-ink-400">Chứng chỉ bị thu hồi sẽ biến mất khỏi hồ sơ của học viên ở lần đồng bộ tiếp theo.</p>
        </div>
      )}
      {tab === 'reports' && (
        <div className="flex flex-col gap-2" data-testid="admin-reports">
          {reportsError && <p className="rounded-xl bg-coral-100 p-3 text-sm font-bold text-coral-600">{reportsError}</p>}
          {reports?.length === 0 && <p className="font-bold text-ink-400">Chưa có tin nhắn nào bị báo cáo.</p>}
          {reports?.map((r) => {
            const sender = users?.find((u) => u.uid === r.from);
            return (
              <div key={r.id} className="card flex flex-col gap-2 !p-3" data-testid="admin-report" data-status={r.status}>
                <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
                  <span className="text-ink-400">{new Date(r.createdAt).toLocaleString('vi-VN')}</span>
                  <span className={r.status === 'open' ? 'text-coral-500' : 'text-ink-400'}>
                    {r.status === 'open' ? 'Chờ xử lý' : r.status === 'hidden' ? 'Đã ẩn tin nhắn' : 'Đã bỏ qua'}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words rounded-xl bg-mist px-3 py-2 font-semibold text-ink-700" data-testid="report-text">
                  {r.text}
                </p>
                <p className="text-xs font-bold text-ink-500">
                  Người gửi: <b>{sender?.displayName ?? r.fromName}</b> {sender?.email && `(${sender.email})`}{' '}
                  {sender?.locked && <span className="rounded bg-coral-500 px-1.5 text-white">đã khóa</span>}
                  <br />
                  Người báo cáo: <b>{r.reporterName}</b>
                  {r.reason && ` · Lý do: ${r.reason}`}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {r.status !== 'hidden' && (
                    <button type="button" className="chip !py-1 !text-xs !text-coral-500" onClick={() => act('ẩn tin nhắn', () => api.hideReported(r, acc.user?.uid ?? ''))} data-testid="report-hide">
                      Ẩn tin nhắn
                    </button>
                  )}
                  {r.status === 'open' && (
                    <button type="button" className="chip !py-1 !text-xs" onClick={() => act('bỏ qua báo cáo', () => api.dismissReport(r, acc.user?.uid ?? ''))} data-testid="report-dismiss">
                      Bỏ qua
                    </button>
                  )}
                  <button
                    type="button"
                    className="chip !py-1 !text-xs"
                    disabled={r.from === acc.user?.uid}
                    onClick={() => act('khóa/mở khóa', () => api.setLocked(r.from, !sender?.locked))}
                    data-testid="report-lock"
                  >
                    {sender?.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản người gửi'}
                  </button>
                  {r.status !== 'open' && (
                    <button type="button" className="chip !py-1 !text-xs" onClick={() => act('xóa báo cáo', () => api.deleteReport(r))}>
                      Xóa báo cáo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-xs font-bold text-ink-400">Ẩn tin nhắn sẽ xóa nội dung khỏi cuộc trò chuyện của hai người; bản sao vẫn được giữ ở đây để đối chiếu.</p>
        </div>
      )}
      {cert && <CertificateView cert={cert} onClose={() => setCert(null)} />}
      <Footer />
    </div>
  );
}

function RestoreList({ onRestore }: { onRestore: (id: string) => void }) {
  const hidden = BUNDLED_LESSONS.filter((b) => !LESSON_BY_ID[b.id]);
  const strip = (ws: object[]) => JSON.stringify(ws.map((w) => ({ ...w, lessonId: undefined })));
  const edited = BUNDLED_LESSONS.filter((b) => LESSON_BY_ID[b.id] && strip(LESSON_BY_ID[b.id].words) !== strip(b.words));
  const list = [...hidden, ...edited];
  if (!list.length) return null;
  return (
    <div className="card mt-2 !p-3">
      <div className="mb-1 text-sm font-black">Bài gốc đã sửa/xóa</div>
      {list.map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-2 py-1 text-sm font-bold">
          <span className="truncate">
            {b.title} {LESSON_BY_ID[b.id] ? '(đã sửa)' : '(đã xóa)'}
          </span>
          <button type="button" className="chip !py-1 !text-xs" onClick={() => onRestore(b.id)}>
            Khôi phục bản gốc
          </button>
        </div>
      ))}
    </div>
  );
}

const Stat = ({ value, label }: { value: number; label: string }) => (
  <div className="card !p-3">
    <div className="text-2xl font-black text-leaf-600">{value}</div>
    <div className="text-xs font-bold text-ink-400">{label}</div>
  </div>
);

const VIP_TERMS: [number, string][] = [
  [1, '1 tháng'],
  [3, '3 tháng'],
  [6, '6 tháng'],
  [12, '1 năm'],
];
/** One account in the VIP tab: quick terms, an exact expiry date, and switching VIP off. */
function VipRow({ u, now, onSet }: { u: api.AdminUser; now: number; onSet: (until: number) => void }) {
  const [date, setDate] = useState('');
  const active = u.vipUntil > now;
  const until = endOfDay(date);
  return (
    <div className="card flex flex-col gap-2 !p-3" data-testid="vip-user">
      <div className="min-w-0">
        <div className="truncate font-black">{u.displayName}</div>
        <div className="truncate text-xs font-bold text-ink-400">{u.email || '(không có email)'}</div>
        <div className={`text-xs font-extrabold ${active ? 'text-sun-600' : 'text-ink-400'}`} data-testid="vip-until">
          {active ? `VIP đến hết ngày ${fmtVipDate(u.vipUntil)}` : u.vipUntil ? `VIP đã hết hạn ngày ${fmtVipDate(u.vipUntil)}` : 'Chưa có VIP'}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {VIP_TERMS.map(([m, label]) => (
          <button key={m} type="button" className="chip !py-1 !text-xs" onClick={() => onSet(extendVip(u.vipUntil, m))} data-testid={`vip-add-${m}`}>
            {active ? '+' : ''}
            {label}
          </button>
        ))}
        {active && (
          <button type="button" className="chip !py-1 !text-xs !text-coral-600" onClick={() => confirm(`Tắt VIP của ${u.email || u.displayName}?`) && onSet(0)} data-testid="vip-off">
            Tắt VIP
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input type="date" className="input !py-1.5 text-sm" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Ngày hết hạn" data-testid="vip-date" />
        <button type="button" className="chip !py-1 !text-xs" disabled={until <= now} onClick={() => onSet(until)} data-testid="vip-set-date">
          Đặt ngày hết hạn
        </button>
      </div>
    </div>
  );
}
