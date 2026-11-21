import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { cleanMessage, getSocial, pairId, resetSocial, setSocial, type ChatMeta, type Friend, type FriendRequest } from './socialState';

/*
 * Friends + 1-to-1 chat (text and emoji only).
 *   profiles/{uid}                      public name, used to find people
 *   friendRequests/{from_to}            pending request
 *   friendships/{pairId}                users: [a, b] (sorted) – only friends can chat
 *   blocks/{by_target}                  a blocked user cannot send a new request
 *   chats/{pairId}                      last message + unread counters
 *   chats/{pairId}/messages/{id}        from, text, at (+ hidden when removed by an admin)
 *   reports/{pairId_msgId}              copy of a reported message for the admin page
 * Access is enforced by firestore.rules.
 */

export interface Message {
  id: string;
  from: string;
  text: string;
  at: number;
  hidden: boolean;
}
export interface FoundUser {
  uid: string;
  name: string;
}

let stops: Unsubscribe[] = [];
let myName = '';

const errorKind = (e: unknown) => ((e as { code?: string }).code === 'permission-denied' ? 'rules' : 'network') as 'rules' | 'network';
const fail = (e: unknown) => {
  console.warn('Friends unavailable', e);
  setSocial({ ready: true, error: errorKind(e) });
};

export function setSocialName(name: string) {
  myName = name;
}

/** Start the realtime listeners for the signed-in user. */
export function startSocial(uid: string, name: string) {
  stopSocial();
  myName = name;
  let pending = 4;
  const ok = () => {
    if (--pending <= 0 && !getSocial().ready) setSocial({ ready: true });
  };
  const once = (fn: () => void) => {
    let first = true;
    return () => {
      fn();
      if (first) {
        first = false;
        ok();
      }
    };
  };
  const reqOf = (d: { id: string; data: () => Record<string, unknown> }): FriendRequest => {
    const x = d.data();
    return { id: d.id, from: String(x.from), to: String(x.to), fromName: String(x.fromName ?? 'Học viên'), toName: String(x.toName ?? 'Học viên'), createdAt: Number(x.createdAt ?? 0) };
  };
  const done = once(() => {});
  stops.push(
    onSnapshot(
      query(collection(db, 'friendships'), where('users', 'array-contains', uid)),
      (snap) => {
        const friends: Friend[] = snap.docs.map((d) => {
          const x = d.data();
          const other = (x.users as string[]).find((u) => u !== uid) ?? '';
          return { uid: other, name: String((x.names as Record<string, string> | undefined)?.[other] ?? 'Học viên'), pairId: d.id, since: Number(x.createdAt ?? 0) };
        });
        setSocial({ friends: friends.sort((a, b) => a.name.localeCompare(b.name, 'vi')), error: '' });
        done();
      },
      fail,
    ),
  );
  const doneIn = once(() => {});
  stops.push(
    onSnapshot(
      query(collection(db, 'friendRequests'), where('to', '==', uid)),
      (snap) => {
        setSocial({ incoming: snap.docs.map(reqOf).sort((a, b) => b.createdAt - a.createdAt) });
        doneIn();
      },
      fail,
    ),
  );
  const doneOut = once(() => {});
  stops.push(
    onSnapshot(
      query(collection(db, 'friendRequests'), where('from', '==', uid)),
      (snap) => {
        setSocial({ outgoing: snap.docs.map(reqOf).sort((a, b) => b.createdAt - a.createdAt) });
        doneOut();
      },
      fail,
    ),
  );
  const doneChats = once(() => {});
  stops.push(
    onSnapshot(
      query(collection(db, 'chats'), where('users', 'array-contains', uid)),
      (snap) => {
        const chats: Record<string, ChatMeta> = {};
        for (const d of snap.docs) {
          const x = d.data();
          chats[d.id] = {
            id: d.id,
            lastText: String(x.lastText ?? ''),
            lastAt: Number(x.lastAt ?? 0),
            lastFrom: String(x.lastFrom ?? ''),
            unread: Number((x.unread as Record<string, number> | undefined)?.[uid] ?? 0),
          };
        }
        setSocial({ chats });
        doneChats();
      },
      fail,
    ),
  );
  stops.push(
    onSnapshot(
      query(collection(db, 'blocks'), where('by', '==', uid)),
      (snap) => setSocial({ blocked: snap.docs.map((d) => ({ uid: String(d.data().target), name: String(d.data().targetName ?? 'Học viên') })) }),
      (e) => console.warn('Block list unavailable', e),
    ),
  );
}

export function stopSocial() {
  stops.forEach((s) => s());
  stops = [];
  resetSocial();
}

const uidNow = () => {
  const u = auth.currentUser?.uid;
  if (!u) throw Object.assign(new Error('Chưa đăng nhập'), { code: 'app/signed-out' });
  return u;
};

/** Find learners whose display name starts with `text` (case-insensitive). */
export async function searchUsers(text: string): Promise<FoundUser[]> {
  const uid = uidNow();
  const q = text.trim().toLowerCase();
  if (q.length < 2) return [];
  const snap = await getDocs(query(collection(db, 'profiles'), where('nameLower', '>=', q), where('nameLower', '<=', `${q}\uf8ff`), limit(20)));
  return snap.docs.filter((d) => d.id !== uid).map((d) => ({ uid: d.id, name: String(d.data().displayName ?? 'Học viên') }));
}

export async function sendRequest(to: FoundUser) {
  const uid = uidNow();
  await setDoc(doc(db, 'friendRequests', `${uid}_${to.uid}`), { from: uid, to: to.uid, fromName: myName || 'Học viên', toName: to.name, createdAt: Date.now() });
}

/** Accept: create the friendship and remove the request in one batch. */
export async function acceptRequest(r: FriendRequest) {
  const uid = uidNow();
  const id = pairId(uid, r.from);
  const batch = writeBatch(db);
  batch.set(doc(db, 'friendships', id), { users: [uid, r.from].sort(), names: { [uid]: myName || r.toName, [r.from]: r.fromName }, createdAt: Date.now() });
  batch.delete(doc(db, 'friendRequests', r.id));
  await batch.commit();
}

/** Decline an incoming request or cancel one I sent. */
export const removeRequest = (r: FriendRequest) => deleteDoc(doc(db, 'friendRequests', r.id));

export const removeFriend = (f: Friend) => deleteDoc(doc(db, 'friendships', f.pairId));

/** Block: the user can no longer send me requests; an existing friendship and pending requests are removed. */
export async function blockUser(target: FoundUser) {
  const uid = uidNow();
  const s = getSocial();
  const batch = writeBatch(db);
  batch.set(doc(db, 'blocks', `${uid}_${target.uid}`), { by: uid, target: target.uid, targetName: target.name, createdAt: Date.now() });
  if (s.friends.some((f) => f.uid === target.uid)) batch.delete(doc(db, 'friendships', pairId(uid, target.uid)));
  for (const r of [...s.incoming, ...s.outgoing]) if (r.from === target.uid || r.to === target.uid) batch.delete(doc(db, 'friendRequests', r.id));
  await batch.commit();
}
export const unblockUser = (target: string) => deleteDoc(doc(db, 'blocks', `${uidNow()}_${target}`));

// ---------- chat ----------
/** Make sure the chat document exists (needed before its messages can be read). */
async function ensureChat(f: Friend) {
  if (getSocial().chats[f.pairId]) return;
  await setDoc(doc(db, 'chats', f.pairId), { users: [uidNow(), f.uid].sort(), lastText: '', lastAt: 0, lastFrom: '', unread: {} });
}

/** Listen to the latest messages of a chat (oldest first). */
export function watchMessages(f: Friend, onData: (m: Message[]) => void, onError: (kind: 'rules' | 'network') => void): () => void {
  let stop: Unsubscribe | null = null;
  let cancelled = false;
  ensureChat(f)
    .then(() => {
      if (cancelled) return;
      stop = onSnapshot(
        query(collection(db, 'chats', f.pairId, 'messages'), orderBy('at'), limitToLast(300)),
        (snap) =>
          onData(
            snap.docs.map((d) => {
              const x = d.data();
              return { id: d.id, from: String(x.from), text: String(x.text ?? ''), at: Number(x.at ?? 0), hidden: x.hidden === true };
            }),
          ),
        (e) => onError(errorKind(e)),
      );
    })
    .catch((e) => onError(errorKind(e)));
  return () => {
    cancelled = true;
    stop?.();
  };
}

/** Send a text/emoji message. Only works between friends (enforced by the rules). */
export async function sendMessage(f: Friend, raw: string) {
  const uid = uidNow();
  const text = cleanMessage(raw);
  if (!text) return;
  await ensureChat(f);
  const at = Date.now();
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'chats', f.pairId, 'messages')), { from: uid, text, at });
  batch.update(doc(db, 'chats', f.pairId), { lastText: text.slice(0, 80), lastAt: at, lastFrom: uid, [`unread.${f.uid}`]: increment(1) });
  await batch.commit();
}

export async function markRead(f: Friend) {
  if (!getSocial().chats[f.pairId]?.unread) return;
  await updateDoc(doc(db, 'chats', f.pairId), { [`unread.${uidNow()}`]: 0 }).catch(() => undefined);
}

/** Only the sender can delete a message. */
export const deleteMessage = (f: Friend, m: Message) => deleteDoc(doc(db, 'chats', f.pairId, 'messages', m.id));

/** Report a friend's message to the admins (a copy is stored so they can review it). */
export async function reportMessage(f: Friend, m: Message, reason: string) {
  const uid = uidNow();
  await setDoc(doc(db, 'reports', `${f.pairId}_${m.id}`), {
    chatId: f.pairId,
    msgId: m.id,
    from: m.from,
    fromName: f.name,
    text: m.text,
    at: m.at,
    reporter: uid,
    reporterName: myName || 'Học viên',
    reason: reason.trim().slice(0, 200),
    createdAt: Date.now(),
    status: 'open',
  });
}
