import { useState } from 'react';
import { loadCloud } from '../lib/account';
import { Close } from './Icons';
import Panda from './Panda';

/** Shown when a learner who is not logged in opens a lesson from Part 3 on (see lib/gate.ts). */
export default function LoginGate({ onClose, onEmail }: { onClose: () => void; onEmail: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const google = async () => {
    setBusy(true);
    setError('');
    try {
      const m = await loadCloud();
      try {
        await m.loginGoogle();
        onClose();
      } catch (e) {
        setError(m.authErrorMessage(e));
      }
    } catch {
      setError('Không tải được phần đăng nhập. Hãy kiểm tra kết nối mạng rồi thử lại.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Cần đăng nhập" data-testid="login-gate">
      <div className="w-full max-w-md animate-pop rounded-3xl bg-white p-5 text-left text-ink-700">
        <div className="mb-2 flex items-start gap-3">
          <Panda size={52} mood="happy" />
          <h3 className="flex-1 text-lg font-black leading-tight">Đăng nhập để học tiếp từ Phần 3</h3>
          <button type="button" aria-label="Đóng" onClick={onClose} data-testid="login-gate-x">
            <Close size={22} />
          </button>
        </div>
        <p className="text-sm font-bold text-ink-500" data-testid="login-gate-text">
          Phần 1–2 học tự do. Từ Phần 3, bạn cần đăng nhập để không mất <b className="text-ink-700">điểm XP</b>, <b className="text-ink-700">thứ hạng</b> và{' '}
          <b className="text-ink-700">lịch sử học</b> khi đổi máy hoặc xóa dữ liệu trình duyệt. Điểm và bài đã học ở Phần 1–2 sẽ được gộp vào tài khoản.
        </p>
        {error && (
          <p className="mt-2 text-sm font-bold text-coral-600" data-testid="login-gate-error">
            {error}
          </p>
        )}
        <button type="button" className="btn-green mt-4 w-full" disabled={busy} onClick={() => void google()} data-testid="login-gate-google">
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập bằng Google'}
        </button>
        <button type="button" className="btn-white mt-2 w-full !normal-case" disabled={busy} onClick={onEmail} data-testid="login-gate-email">
          Đăng nhập bằng Email / Mật khẩu
        </button>
      </div>
    </div>
  );
}
