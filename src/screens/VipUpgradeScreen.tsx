import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAccount } from '../lib/account';
import { fmtVipDate, useVip } from '../lib/vip';
import { EMPTY_PAYMENT, STATUS_LABEL, VIP_PLANS, accountReady, fmtVnd, isOpen, orderMatches, planLabel, planPrice, vietQrPayload, type PaymentConfig, type VipOrder } from '../lib/payment';
import { cancelOrder, createOrder, submitOrder, watchMyOrders, watchPayment } from '../lib/paymentCloud';
import { CONTACT_EMAIL } from '../components/Footer';
import { Chevron } from '../components/Icons';

const errCode = (e: unknown) => (e as { code?: string; message?: string }).code ?? (e as Error).message ?? String(e);

function Copy({ text, id }: { text: string; id: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="chip !py-0.5 !text-xs"
      onClick={() => navigator.clipboard?.writeText(text).then(() => setDone(true), () => undefined)}
      data-testid={`copy-${id}`}
    >
      {done ? 'Đã chép' : 'Chép'}
    </button>
  );
}

/** v5.7.0: buy VIP by bank transfer (VietQR); an admin confirms the payment (see lib/payment.ts). */
export default function VipUpgradeScreen({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const acc = useAccount();
  const vip = useVip();
  const [cfg, setCfg] = useState<PaymentConfig | null>(null);
  const [orders, setOrders] = useState<VipOrder[]>([]);
  const [months, setMonths] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [qr, setQr] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const uid = acc.user?.uid;

  useEffect(() => watchPayment(setCfg, () => setCfg(EMPTY_PAYMENT)), []);
  useEffect(() => (uid ? watchMyOrders(uid, setOrders, (e) => setErr(`Không tải được đơn: ${errCode(e)}`)) : undefined), [uid]);

  const order = orders.find((o) => o.code === code) ?? null;
  useEffect(() => {
    if (!order || !isOpen(order)) return setQr('');
    QRCode.toDataURL(vietQrPayload(order.bankBin, order.accountNo, order.amount, order.code), { width: 520, margin: 1 }).then(setQr, () => setQr(''));
  }, [order]);

  const ready = !!cfg && accountReady(cfg);
  const pick = async (m: number) => {
    if (!cfg || !acc.user || busy) return;
    setErr('');
    setMonths(m);
    const old = orders.find((o) => orderMatches(o, cfg, m));
    if (old) return setCode(old.code);
    setBusy(true);
    try {
      setCode((await createOrder(acc.user, cfg, m)).code);
    } catch (e) {
      setErr(`Không tạo được đơn: ${errCode(e)}`);
    } finally {
      setBusy(false);
    }
  };
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr('');
    try {
      await fn();
    } catch (e) {
      setErr(`Thao tác thất bại: ${errCode(e)}`);
    } finally {
      setBusy(false);
    }
  };
  const contact = (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-extrabold text-ink-700 underline">
      {CONTACT_EMAIL}
    </a>
  );

  return (
    <div className="mx-auto min-h-[100dvh] max-w-md px-4 pb-10 pt-4" data-testid="vip-upgrade">
      <button type="button" onClick={onClose} className="mb-2 flex items-center gap-1 font-extrabold text-ink-400" data-testid="vip-upgrade-back">
        <Chevron dir="left" size={22} /> Quay lại
      </button>
      <h1 className="text-2xl font-black">Nâng cấp VIP</h1>
      <p className="mb-4 text-sm font-bold text-ink-400">VIP mở các Phần có nhãn VIP ở mọi khoá học. Thanh toán bằng chuyển khoản ngân hàng (VietQR); VIP được bật sau khi admin xác nhận đã nhận tiền.</p>

      {!acc.user ? (
        <div className="card flex flex-col gap-3" data-testid="vip-upgrade-login">
          <p className="text-sm font-bold text-ink-500">Bạn cần đăng nhập để mua VIP, vì VIP được gắn vào tài khoản của bạn.</p>
          <button type="button" className="btn-green" onClick={onLogin}>
            Đăng nhập / Đăng ký
          </button>
        </div>
      ) : (
        <>
          {vip && (
            <p className="mb-3 rounded-2xl bg-sun-400/15 px-3 py-2 text-sm font-black text-sun-600" data-testid="vip-upgrade-current">
              {acc.vipUntil > Date.now() ? `Bạn đang có VIP đến hết ngày ${fmtVipDate(acc.vipUntil)}. Mua thêm sẽ được cộng tiếp vào hạn này.` : 'Tài khoản quản trị luôn có VIP.'}
            </p>
          )}
          {!cfg ? (
            <p className="font-bold text-ink-400">Đang tải…</p>
          ) : !ready ? (
            <p className="card text-sm font-bold text-ink-500" data-testid="vip-upgrade-closed">
              Hiện chưa mở bán VIP qua chuyển khoản. Vui lòng liên hệ admin qua email {contact}.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2" data-testid="vip-plans">
              {VIP_PLANS.map((m) => {
                const price = planPrice(cfg, m);
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={!price || busy}
                    onClick={() => void pick(m)}
                    className={`card !p-3 text-left ${months === m && price ? 'ring-4 ring-leaf-400' : ''} ${price ? '' : 'opacity-70'}`}
                    data-testid={`vip-plan-${m}`}
                  >
                    <div className="text-lg font-black">{planLabel(m)}</div>
                    {price ? (
                      <div className="font-black text-leaf-600" data-testid={`vip-price-${m}`}>{fmtVnd(price)}</div>
                    ) : (
                      <div className="text-xs font-bold text-ink-400" data-testid={`vip-unpriced-${m}`}>Chưa mở bán, vui lòng liên hệ admin</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {ready && Object.keys(cfg!.prices).length < VIP_PLANS.length && (
            <p className="mt-2 text-xs font-bold text-ink-400">Gói chưa có giá: liên hệ admin qua email {contact}.</p>
          )}

          {order && isOpen(order) && (
            <div className="card mt-4 flex flex-col gap-2" data-testid="vip-order">
              <div className="flex items-center justify-between">
                <h2 className="font-black">Đơn {planLabel(order.months)}</h2>
                <span className="text-xs font-black text-sun-600" data-testid="vip-order-status">{STATUS_LABEL[order.status]}</span>
              </div>
              {qr && <img src={qr} alt={`Mã VietQR chuyển ${fmtVnd(order.amount)}`} className="mx-auto w-full max-w-[260px] rounded-2xl bg-white" data-testid="vip-qr" />}
              <p className="text-center text-xs font-bold text-ink-400">Mở app ngân hàng, quét mã QR. Số tiền và nội dung đã điền sẵn.</p>
              <dl className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-sm" data-testid="vip-transfer">
                <dt className="font-bold text-ink-400">Ngân hàng</dt>
                <dd className="font-black" data-testid="vip-bank">{order.bankName}</dd>
                <span />
                <dt className="font-bold text-ink-400">Số TK</dt>
                <dd className="font-black" data-testid="vip-account">{order.accountNo}</dd>
                <Copy text={order.accountNo} id="account" />
                <dt className="font-bold text-ink-400">Chủ TK</dt>
                <dd className="font-black" data-testid="vip-holder">{order.accountName}</dd>
                <span />
                <dt className="font-bold text-ink-400">Số tiền</dt>
                <dd className="font-black text-leaf-600" data-testid="vip-amount">{fmtVnd(order.amount)}</dd>
                <Copy text={String(order.amount)} id="amount" />
                <dt className="font-bold text-ink-400">Nội dung</dt>
                <dd className="font-black tracking-wide" data-testid="vip-code">{order.code}</dd>
                <Copy text={order.code} id="code" />
              </dl>
              <p className="rounded-xl bg-coral-100 px-3 py-2 text-xs font-bold text-coral-600">Ghi đúng nội dung {order.code} để admin đối soát. Chuyển sai số tiền hoặc thiếu nội dung có thể làm chậm việc kích hoạt.</p>
              {order.status === 'pending' ? (
                <>
                  <input
                    className="input"
                    placeholder="Mã giao dịch hoặc ghi chú (không bắt buộc)"
                    value={note}
                    maxLength={200}
                    onChange={(e) => setNote(e.target.value)}
                    data-testid="vip-note"
                  />
                  <button type="button" className="btn-green" disabled={busy} onClick={() => void act(() => submitOrder(order.code, note))} data-testid="vip-paid">
                    Tôi đã chuyển khoản
                  </button>
                </>
              ) : (
                <p className="text-sm font-bold text-leaf-700" data-testid="vip-submitted">
                  Đã gửi. Admin sẽ đối chiếu giao dịch và bật VIP cho bạn; trang này tự cập nhật khi xong.
                </p>
              )}
              <button type="button" className="btn-white" disabled={busy} onClick={() => confirm('Huỷ đơn này?') && void act(() => cancelOrder(order.code))} data-testid="vip-cancel">
                Huỷ đơn
              </button>
            </div>
          )}
          {order?.status === 'paid' && (
            <p className="card mt-4 text-sm font-black text-leaf-700" data-testid="vip-order-paid">
              Đã nhận tiền đơn {order.code}. VIP của bạn có hạn đến hết ngày {fmtVipDate(order.vipUntil ?? acc.vipUntil)}.
            </p>
          )}
          {order?.status === 'rejected' && (
            <p className="card mt-4 text-sm font-bold text-coral-600" data-testid="vip-order-rejected">
              Đơn {order.code} bị từ chối. Nếu bạn đã chuyển khoản, hãy liên hệ admin qua email {contact}.
            </p>
          )}
          {err && <p role="alert" className="mt-3 text-sm font-bold text-coral-500">{err}</p>}

          {orders.length > 0 && (
            <>
              <h2 className="mb-2 mt-6 font-black">Đơn của tôi</h2>
              <ul className="flex flex-col gap-2" data-testid="vip-my-orders">
                {orders.map((o) => (
                  <li key={o.code}>
                    <button type="button" className="card flex w-full items-center justify-between gap-2 !p-3 text-left" onClick={() => (setCode(o.code), setMonths(o.months))} data-testid="vip-my-order">
                      <span className="min-w-0">
                        <span className="block font-black">{o.code}</span>
                        <span className="block text-xs font-bold text-ink-400">
                          {planLabel(o.months)} · {fmtVnd(o.amount)} · {new Date(o.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </span>
                      <span className={`shrink-0 text-xs font-black ${o.status === 'paid' ? 'text-leaf-600' : isOpen(o) ? 'text-sun-600' : 'text-ink-400'}`}>{STATUS_LABEL[o.status]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
