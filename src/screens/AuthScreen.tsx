import { useState } from 'react';
import Panda from '../components/Panda';
import Footer from '../components/Footer';
import { Chevron } from '../components/Icons';
import { firebaseConfigured, loadCloud, useAccount } from '../lib/account';
import { NOT_CONFIGURED_MSG } from '../lib/firebaseConfig';
import { getProgress } from '../lib/store';
import { unsupportedBrowser } from '../lib/browser';
import { hasProgress } from '../lib/merge';

type Mode = 'login' | 'register' | 'reset';

const GoogleLogo = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export default function AuthScreen({ onClose }: { onClose: () => void }) {
  const acc = useAccount();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState(getProgress().settings.name);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const local = hasProgress(getProgress());
  const webview = unsupportedBrowser();

  const run = async (fn: (m: typeof import('../lib/cloud')) => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    setErr('');
    setInfo('');
    let m: typeof import('../lib/cloud') | null = null;
    try {
      m = await loadCloud();
      await fn(m);
      if (okMsg) setInfo(okMsg);
      else onClose();
    } catch (e) {
      setErr(m ? m.authErrorMessage(e) : 'Không kết nối được máy chủ. Hãy kiểm tra mạng.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register') {
      if (!name.trim()) return setErr('Hãy nhập tên hiển thị.');
      if (password.length < 6) return setErr('Mật khẩu cần ít nhất 6 ký tự.');
      void run((m) => m.registerEmail(name, email, password));
    } else if (mode === 'login') void run((m) => m.loginEmail(email, password));
    else void run((m) => m.resetPassword(email), 'Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư của bạn.');
  };

  if (acc.user)
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center px-6 pt-16 text-center">
        <Panda size={120} mood="cheer" />
        <h1 className="mt-3 text-2xl font-black">Xin chào, {acc.user.displayName}!</h1>
        <p className="font-semibold text-ink-500">Bạn đã đăng nhập. Tiến độ sẽ được đồng bộ lên đám mây.</p>
        <button type="button" className="btn-green mt-6" onClick={onClose}>
          Tiếp tục học
        </button>
        <Footer className="mt-auto" />
      </div>
    );

  if (!firebaseConfigured)
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col items-center px-6 pt-16 text-center" data-testid="firebase-not-configured">
        <Panda size={120} mood="sad" />
        <h1 className="mt-3 text-2xl font-black">Chưa cấu hình Firebase</h1>
        <p className="mt-1 font-semibold text-ink-500">{NOT_CONFIGURED_MSG}</p>
        <button type="button" className="btn-green mt-6" onClick={onClose}>
          Quay lại
        </button>
        <Footer className="mt-auto" />
      </div>
    );

  const title = mode === 'register' ? 'Tạo tài khoản' : mode === 'login' ? 'Đăng nhập' : 'Quên mật khẩu';
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-4">
      <button type="button" onClick={onClose} className="flex items-center gap-1 self-start font-extrabold text-ink-400" aria-label="Quay lại">
        <Chevron dir="left" size={22} /> Quay lại
      </button>
      <div className="mt-2 flex items-center gap-3">
        <Panda size={76} mood="happy" />
        <div>
          <h1 className="text-2xl font-black" data-testid="auth-title">
            {title}
          </h1>
          <p className="text-sm font-semibold text-ink-500">Lưu tiến độ, thi đua xếp hạng và học trên mọi thiết bị.</p>
        </div>
      </div>
      {local && mode !== 'reset' && (
        <p className="mt-3 rounded-2xl bg-leaf-50 px-3 py-2 text-sm font-bold text-leaf-700">
          Tiến độ đang có trên máy này sẽ được gộp vào tài khoản (giữ XP và chuỗi ngày cao hơn).
        </p>
      )}
      {(webview === 'zalo' || webview === 'facebook') && (
        <p className="mt-3 rounded-2xl bg-coral-100 px-3 py-2 text-sm font-bold text-coral-600" data-testid="auth-webview">
          Bạn đang mở GreenPanda trong {webview === 'zalo' ? 'Zalo' : 'Facebook/Messenger'}: trình duyệt này không giữ đăng nhập lâu dài và có thể chặn đăng nhập Google. Bấm menu (⋯) → “Mở bằng trình duyệt” để dùng Chrome.
        </p>
      )}
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        {mode === 'register' && (
          <input className="input" placeholder="Tên hiển thị (hiện trên bảng xếp hạng)" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
        )}
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        {mode !== 'reset' && (
          <input
            className="input"
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            required
          />
        )}
        {!err && acc.notice && <p className="rounded-xl bg-coral-100 p-3 text-sm font-bold text-coral-600" data-testid="auth-notice">{acc.notice}</p>}
        {err && (
          <p role="alert" className="text-sm font-bold text-coral-500">
            {err}
          </p>
        )}
        {info && <p className="text-sm font-bold text-leaf-600">{info}</p>}
        <button type="submit" className="btn-green" disabled={busy} data-testid="auth-submit">
          {busy ? 'Đang xử lý…' : mode === 'register' ? 'Đăng ký' : mode === 'login' ? 'Đăng nhập' : 'Gửi email đặt lại'}
        </button>
      </form>
      {mode !== 'reset' && (
        <>
          <div className="my-4 flex items-center gap-3 text-sm font-extrabold text-ink-300">
            <span className="h-0.5 flex-1 bg-cloud" /> HOẶC <span className="h-0.5 flex-1 bg-cloud" />
          </div>
          <button type="button" className="btn-white gap-3 !normal-case" disabled={busy} onClick={() => void run((m) => m.loginGoogle())} data-testid="google-login">
            <GoogleLogo /> Tiếp tục với Google
          </button>
        </>
      )}
      <div className="mt-5 flex flex-col items-center gap-2 text-sm font-extrabold">
        {mode === 'login' && (
          <>
            <button type="button" className="text-sky-600" onClick={() => setMode('register')}>
              Chưa có tài khoản? Đăng ký
            </button>
            <button type="button" className="text-ink-400" onClick={() => setMode('reset')}>
              Quên mật khẩu?
            </button>
          </>
        )}
        {mode !== 'login' && (
          <button type="button" className="text-sky-600" onClick={() => setMode('login')}>
            Đã có tài khoản? Đăng nhập
          </button>
        )}
      </div>
      <Footer className="mt-auto" />
    </div>
  );
}
