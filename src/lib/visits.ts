// Anonymous visit counters and presence for the admin "Thống kê truy cập" card.
// Writes per client: 2 on app open (total + today's counter) and 1 heartbeat a minute while the tab is visible.
import { collection, doc, getCountFromServer, getDoc, increment, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const HEARTBEAT_MS = 60_000;
export const ONLINE_WINDOW_MS = 5 * 60_000;
const ID_KEY = 'greenpanda-client-id';

/** Calendar day in Vietnam, so that "today" is the same for every visitor. */
export const dayId = (d = new Date()) => `day-${new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d)}`;

function clientId() {
  const make = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('');
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id || !/^[a-z0-9]{12}$/.test(id)) localStorage.setItem(ID_KEY, (id = make()));
    return id;
  } catch {
    return make();
  }
}

let started = false;
/** Call once per app load. Failures (offline, rules not published yet) are ignored. */
export function startVisits() {
  if (started) return;
  started = true;
  const quiet = () => undefined;
  void setDoc(doc(db, 'stats', 'visits'), { count: increment(1) }, { merge: true }).catch(quiet);
  void setDoc(doc(db, 'stats', dayId()), { count: increment(1) }, { merge: true }).catch(quiet);
  const id = clientId();
  let last = 0;
  const beat = () => {
    if (document.visibilityState !== 'visible' || Date.now() - last < HEARTBEAT_MS - 5000) return;
    last = Date.now();
    void setDoc(doc(db, 'presence', id), { at: last }).catch(quiet);
  };
  beat();
  setInterval(beat, HEARTBEAT_MS);
  document.addEventListener('visibilitychange', beat);
}

export interface VisitStats {
  online: number;
  total: number;
  today: number;
}

/** Admins only (enforced by firestore.rules). */
export async function loadVisitStats(): Promise<VisitStats> {
  const [online, total, today] = await Promise.all([
    getCountFromServer(query(collection(db, 'presence'), where('at', '>', Date.now() - ONLINE_WINDOW_MS))),
    getDoc(doc(db, 'stats', 'visits')),
    getDoc(doc(db, 'stats', dayId())),
  ]);
  return { online: online.data().count, total: Number(total.data()?.count ?? 0), today: Number(today.data()?.count ?? 0) };
}
