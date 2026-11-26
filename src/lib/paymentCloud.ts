import { collection, doc, getDocs, onSnapshot, query, runTransaction, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { cleanPayment, orderCode, planPrice, type PaymentConfig, type VipOrder } from './payment';
import { extendVip } from './vip';

const cfgRef = () => doc(db, 'config', 'payment');
const orderRef = (code: string) => doc(db, 'vipOrders', code);

export const watchPayment = (cb: (c: PaymentConfig) => void, onErr?: (e: unknown) => void) =>
  onSnapshot(cfgRef(), (s) => cb(cleanPayment(s.exists() ? s.data() : null)), (e) => onErr?.(e));

export const savePayment = (c: PaymentConfig, by: string) =>
  setDoc(cfgRef(), { bankBin: c.bankBin, bankName: c.bankName, accountNo: c.accountNo, accountName: c.accountName, prices: c.prices, updatedAt: Date.now(), updatedBy: by.slice(0, 120) });

const toOrder = (d: { id: string; data: () => Record<string, unknown> }) => ({ ...(d.data() as unknown as VipOrder), code: d.id });
const newestFirst = (a: VipOrder, b: VipOrder) => b.createdAt - a.createdAt;

export const watchMyOrders = (uid: string, cb: (o: VipOrder[]) => void, onErr?: (e: unknown) => void) =>
  onSnapshot(query(collection(db, 'vipOrders'), where('uid', '==', uid)), (s) => cb(s.docs.map(toOrder).sort(newestFirst)), (e) => onErr?.(e));

export async function createOrder(user: { uid: string; email: string | null; displayName: string }, c: PaymentConfig, months: number) {
  const amount = planPrice(c, months);
  if (!amount) throw new Error('not-for-sale');
  const o: VipOrder = {
    code: orderCode(user.uid),
    uid: user.uid,
    email: (user.email ?? '').slice(0, 120),
    name: user.displayName.slice(0, 40),
    months,
    amount,
    bankBin: c.bankBin,
    bankName: c.bankName,
    accountNo: c.accountNo,
    accountName: c.accountName,
    status: 'pending',
    createdAt: Date.now(),
    note: '',
    submittedAt: 0,
  };
  await setDoc(orderRef(o.code), o);
  return o;
}

/** "Tôi đã chuyển khoản": the learner adds the bank reference or a note. */
export const submitOrder = (code: string, note: string) => updateDoc(orderRef(code), { status: 'submitted', note: note.trim().slice(0, 200), submittedAt: Date.now() });
export const cancelOrder = (code: string) => updateDoc(orderRef(code), { status: 'cancelled' });

export async function listOrders() {
  return (await getDocs(collection(db, 'vipOrders'))).docs.map(toOrder).sort(newestFirst);
}

/** Admin saw the money: mark the order paid and extend the account's VIP by the term bought, in one transaction. */
export async function confirmOrder(code: string, by: string, via: 'manual' | 'webhook' = 'manual') {
  return runTransaction(db, async (tx) => {
    const os = await tx.get(orderRef(code));
    if (!os.exists()) throw new Error('order-missing');
    const o = os.data() as VipOrder;
    if (o.status !== 'pending' && o.status !== 'submitted') throw new Error('order-closed');
    const role = doc(db, 'roles', o.uid);
    const rs = await tx.get(role);
    const now = Date.now();
    const until = extendVip(Number(rs.data()?.vipUntil) || 0, o.months, now);
    tx.set(role, { vipUntil: until, vipBy: `${by} (đơn ${code})`.slice(0, 120), updatedAt: now }, { merge: true });
    tx.update(orderRef(code), { status: 'paid', confirmedAt: now, confirmedBy: by.slice(0, 120), vipUntil: until, paidVia: via });
    return until;
  });
}
export const rejectOrder = (code: string, by: string) => updateDoc(orderRef(code), { status: 'rejected', confirmedAt: Date.now(), confirmedBy: by.slice(0, 120) });
