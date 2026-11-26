import { useCallback, useEffect, useState } from 'react';
import { BANKS, EMPTY_PAYMENT, MAX_PRICE, STATUS_LABEL, VIP_PLANS, fmtVnd, isOpen, planLabel, type PaymentConfig, type VipOrder } from '../lib/payment';
import { confirmOrder, listOrders, rejectOrder, savePayment, watchPayment } from '../lib/paymentCloud';
import { fmtVipDate } from '../lib/vip';

const errCode = (e: unknown) => (e as { code?: string; message?: string }).code ?? (e as Error).message ?? String(e);
const fmtTime = (t?: number) => (t ? new Date(t).toLocaleString('vi-VN') : '—');

/** v5.7.0 admin tab "Thanh toán": receiving account + prices (config/payment), orders waiting for a check, history. */
export default function PaymentAdmin({ by }: { by: string }) {
  const [cfg, setCfg] = useState<PaymentConfig | null>(null);
  const [form, setForm] = useState<PaymentConfig>(EMPTY_PAYMENT);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [orders, setOrders] = useState<VipOrder[] | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(
    () =>
      watchPayment(
        (c) => {
          setCfg(c);
          setForm(c);
          setPrices(Object.fromEntries(VIP_PLANS.map((m) => [m, c.prices[String(m)] ? String(c.prices[String(m)]) : ''])));
        },
        (e) => setMsg(`Không đọc được cài đặt: ${errCode(e)}`),
      ),
    [],
  );
  const reload = useCallback(() => listOrders().then(setOrders, (e) => setMsg(`Không tải được đơn: ${errCode(e)}`)), []);
  useEffect(() => void reload(), [reload]);

  const run = async (label: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(label);
    setMsg('');
    try {
      await fn();
      setMsg(ok);
      await reload();
    } catch (e) {
      setMsg(`Thao tác thất bại: ${errCode(e)}`);
    } finally {
      setBusy('');
    }
  };
  const cleanPrices = () => {
    const out: Record<string, number> = {};
    for (const m of VIP_PLANS) {
      const n = Number((prices[m] ?? '').replace(/\D/g, ''));
      if (n > 0 && n <= MAX_PRICE) out[String(m)] = n;
    }
    return out;
  };
  const valid = /^\d{6}$/.test(form.bankBin) && form.bankName.trim() && /^[0-9A-Za-z]{4,19}$/.test(form.accountNo.trim()) && form.accountName.trim();
  const open = (orders ?? []).filter(isOpen).sort((a, b) => Number(b.status === 'submitted') - Number(a.status === 'submitted') || b.createdAt - a.createdAt);
  const done = (orders ?? []).filter((o) => !isOpen(o));

  return (
    <div className="flex flex-col gap-3" data-testid="admin-payment">
      <div className="card flex flex-col gap-2 !p-3">
        <h3 className="font-black">Tài khoản nhận tiền</h3>
        <select
          className="input"
          value={BANKS.some(([b]) => b === form.bankBin) ? form.bankBin : ''}
          onChange={(e) => {
            const b = BANKS.find(([bin]) => bin === e.target.value);
            setForm({ ...form, bankBin: b?.[0] ?? '', bankName: b?.[1] ?? form.bankName });
          }}
          data-testid="pay-bank"
        >
          <option value="">Chọn ngân hàng…</option>
          {BANKS.map(([bin, name]) => (
            <option key={bin} value={bin}>
              {name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Mã BIN (6 số)" inputMode="numeric" maxLength={6} value={form.bankBin} onChange={(e) => setForm({ ...form, bankBin: e.target.value.replace(/\D/g, '') })} data-testid="pay-bin" />
          <input className="input" placeholder="Tên ngân hàng" maxLength={60} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} data-testid="pay-bank-name" />
        </div>
        <input className="input" placeholder="Số tài khoản" maxLength={19} value={form.accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value.replace(/[^0-9A-Za-z]/g, '') })} data-testid="pay-account" />
        <input className="input" placeholder="Tên chủ tài khoản" maxLength={60} value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value.toUpperCase() })} data-testid="pay-holder" />
        <h3 className="mt-1 font-black">Giá VIP (đồng)</h3>
        <p className="text-xs font-bold text-ink-400">Để trống thì mốc đó chưa mở bán, học viên được nhắn liên hệ admin.</p>
        <div className="grid grid-cols-2 gap-2">
          {VIP_PLANS.map((m) => (
            <label key={m} className="text-xs font-extrabold text-ink-500">
              {planLabel(m)}
              <input
                className="input mt-0.5"
                inputMode="numeric"
                placeholder="Chưa mở bán"
                value={prices[m] ?? ''}
                onChange={(e) => setPrices({ ...prices, [m]: e.target.value.replace(/\D/g, '') })}
                data-testid={`pay-price-${m}`}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="btn-green"
          disabled={!valid || !!busy}
          onClick={() =>
            void run(
              'save',
              () => savePayment({ bankBin: form.bankBin, bankName: form.bankName.trim(), accountNo: form.accountNo.trim(), accountName: form.accountName.trim(), prices: cleanPrices() }, by),
              'Đã lưu cài đặt nhận tiền.',
            )
          }
          data-testid="pay-save"
        >
          Lưu cài đặt
        </button>
        {cfg && !cfg.accountNo && <p className="text-xs font-bold text-coral-600">Chưa có tài khoản nhận tiền: học viên chưa mua VIP được.</p>}
      </div>
      {msg && (
        <p className="text-sm font-bold text-ink-500" role="status" data-testid="pay-msg">
          {msg}
        </p>
      )}

      <h3 className="font-black">Đơn chờ xác nhận ({open.length})</h3>
      <p className="-mt-2 text-xs font-bold text-ink-400">Đối chiếu nội dung và số tiền trong app ngân hàng trước khi bấm xác nhận. Xác nhận sẽ cộng thời hạn VIP vào tài khoản.</p>
      {orders === null && <p className="font-bold text-ink-400">Đang tải…</p>}
      {open.map((o) => (
        <div key={o.code} className="card flex flex-col gap-1 !p-3" data-testid="pay-order">
          <div className="flex items-center justify-between gap-2">
            <span className="font-black tracking-wide" data-testid="pay-order-code">{o.code}</span>
            <span className={`text-xs font-black ${o.status === 'submitted' ? 'text-leaf-600' : 'text-ink-400'}`}>{STATUS_LABEL[o.status]}</span>
          </div>
          <div className="text-sm font-bold">
            {o.email || o.name} · {planLabel(o.months)} · <span className="text-leaf-600">{fmtVnd(o.amount)}</span>
          </div>
          <div className="text-xs font-bold text-ink-400">
            Tạo {fmtTime(o.createdAt)}
            {o.submittedAt ? ` · báo đã chuyển ${fmtTime(o.submittedAt)}` : ''} · vào {o.bankName} {o.accountNo}
          </div>
          {o.note && <div className="text-xs font-bold text-ink-500">Ghi chú: {o.note}</div>}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              className="chip !text-xs !text-leaf-700"
              disabled={!!busy}
              onClick={() => confirm(`Xác nhận đã nhận ${fmtVnd(o.amount)} với nội dung ${o.code}?`) && void run(o.code, () => confirmOrder(o.code, by), `Đã bật VIP ${planLabel(o.months)} cho ${o.email || o.name}.`)}
              data-testid="pay-confirm"
            >
              Xác nhận đã nhận tiền
            </button>
            <button type="button" className="chip !text-xs !text-coral-600" disabled={!!busy} onClick={() => confirm(`Từ chối đơn ${o.code}?`) && void run(o.code, () => rejectOrder(o.code, by), 'Đã từ chối đơn.')} data-testid="pay-reject">
              Từ chối
            </button>
          </div>
        </div>
      ))}

      <h3 className="mt-2 font-black">Lịch sử giao dịch</h3>
      {done.length === 0 && orders && <p className="text-sm font-bold text-ink-400">Chưa có giao dịch.</p>}
      <ul className="flex flex-col gap-2" data-testid="pay-history">
        {done.map((o) => (
          <li key={o.code} className="card !p-3 text-xs font-bold text-ink-500" data-testid="pay-history-row">
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-black text-ink-700">{o.code}</span>
              <span className={o.status === 'paid' ? 'font-black text-leaf-600' : 'text-ink-400'}>{STATUS_LABEL[o.status]}</span>
            </div>
            <div>
              {o.email || o.name} · {planLabel(o.months)} · {fmtVnd(o.amount)}
            </div>
            <div>
              {fmtTime(o.confirmedAt || o.createdAt)} · TK nhận {o.bankName} {o.accountNo} ({o.accountName})
            </div>
            {o.status === 'paid' && (
              <div>
                VIP đến {o.vipUntil ? fmtVipDate(o.vipUntil) : '—'} · xác nhận bởi {o.confirmedBy || '—'}
                {o.paidVia === 'webhook' ? ' (tự động)' : ''}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
