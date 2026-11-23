import { useAccount } from '../lib/account';
import { fmtVipDate } from '../lib/vip';
import { Close, Lock } from './Icons';
import { CONTACT_EMAIL } from './Footer';

/** Shown when an account without VIP opens VIP content (see lib/vip.ts). */
export default function VipGate({ onClose, onLogin }: { onClose: () => void; onLogin?: () => void }) {
  const acc = useAccount();
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Dành cho tài khoản VIP" data-testid="vip-gate">
      <div className="w-full max-w-md animate-pop rounded-3xl bg-white p-5 text-left text-ink-700">
        <div className="mb-2 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sun-400 text-white">
            <Lock size={26} />
          </span>
          <h3 className="flex-1 text-lg font-black leading-tight">Khoá học này dành cho tài khoản VIP</h3>
          <button type="button" aria-label="Đóng" onClick={onClose} data-testid="vip-gate-x">
            <Close size={22} />
          </button>
        </div>
        <p className="text-sm font-bold text-ink-500" data-testid="vip-gate-text">
          {acc.user && acc.vipUntil > 0 && <>Quyền VIP của bạn đã hết hạn ngày {fmtVipDate(acc.vipUntil)}. </>}
          Để mở khoá, hãy liên hệ admin qua email{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-extrabold text-ink-700 underline">
            {CONTACT_EMAIL}
          </a>
          {acc.user?.email ? ` và gửi kèm email tài khoản của bạn (${acc.user.email}).` : ' và gửi kèm email tài khoản của bạn.'}
          {!acc.user && ' Bạn cần đăng nhập trước để admin kích hoạt VIP cho tài khoản.'}
        </p>
        {!acc.user && onLogin && (
          <button type="button" className="btn-green mt-4 w-full" onClick={onLogin} data-testid="vip-gate-login">
            Đăng nhập
          </button>
        )}
        <button type="button" className="btn-white mt-2 w-full" onClick={onClose} data-testid="vip-gate-close">
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
