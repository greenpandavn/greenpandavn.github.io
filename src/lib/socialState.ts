import { useSyncExternalStore } from 'react';

/** Firebase-free friends/chat state (filled in by social.ts) so the main bundle stays small. */
export interface Friend {
  uid: string;
  name: string;
  pairId: string;
  since: number;
}
export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  fromName: string;
  toName: string;
  createdAt: number;
}
export interface ChatMeta {
  id: string; // pair id
  lastText: string;
  lastAt: number;
  lastFrom: string;
  unread: number; // messages I have not read yet
}
export interface Blocked {
  uid: string;
  name: string;
}
export interface SocialState {
  ready: boolean;
  /** Set when Firestore refuses the friends collections (rules not published yet, or offline). */
  error: '' | 'rules' | 'network';
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  chats: Record<string, ChatMeta>;
  blocked: Blocked[];
}

const empty = (): SocialState => ({ ready: false, error: '', friends: [], incoming: [], outgoing: [], chats: {}, blocked: [] });
let state = empty();
const listeners = new Set<() => void>();

export const getSocial = () => state;
export function setSocial(patch: Partial<SocialState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
export const resetSocial = () => setSocial(empty());
export function useSocial() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** Stable id of the pair of users (also the id of their friendship and chat documents). */
export const pairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`);
/** Unread messages from friends plus friend requests waiting for an answer (badge on the Friends tab). */
export const socialBadge = (s: SocialState) =>
  s.incoming.length + s.friends.reduce((n, f) => n + (s.chats[f.pairId]?.unread ?? 0), 0);

export const MAX_MESSAGE = 1000;
/** Chat is text + emoji only: strip control characters and trim; empty or too long text is rejected. */
export function cleanMessage(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, MAX_MESSAGE);
}
