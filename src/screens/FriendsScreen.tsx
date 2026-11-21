import { useEffect, useRef, useState } from 'react';
import { firebaseConfigured, loadCloud, useAccount } from '../lib/account';
import { NOT_CONFIGURED_MSG } from '../lib/firebaseConfig';
import { cleanMessage, MAX_MESSAGE, useSocial, type Friend, type SocialState } from '../lib/socialState';
import type { FoundUser, Message } from '../lib/social';
import { Chevron, Friends as FriendsIcon } from '../components/Icons';
import Panda from '../components/Panda';

type View = 'friends' | 'requests' | 'find' | 'blocked';
const api = () => loadCloud().then((m) => m.social);
const RULES_MSG = 'Tính năng bạn bè và tin nhắn chưa được bật trên máy chủ (quy tắc Firestore bản v4 chưa được publish). Vui lòng thử lại sau.';
const errorText = (e: unknown) => {
  const code = (e as { code?: string }).code ?? '';
  if (code === 'permission-denied') return 'Không thực hiện được: bạn không có quyền, hoặc người này không nhận lời mời từ bạn.';
  if (code === 'app/not-configured') return NOT_CONFIGURED_MSG;
  return 'Có lỗi xảy ra. Hãy kiểm tra kết nối mạng và thử lại.';
};
const EMOJI = ['😀', '😂', '🥰', '😍', '😎', '🤔', '😢', '😡', '👍', '👏', '🙏', '💪', '🎉', '🔥', '❤️', '⭐', '🐼', '📚', '✅', '👋'];
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
const timeOf = (t: number) => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dayOf = (t: number) => (sameDay(t, Date.now()) ? 'Hôm nay' : new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
const shortTime = (t: number) => (!t ? '' : sameDay(t, Date.now()) ? timeOf(t) : new Date(t).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }));

const Avatar = ({ name, size = 44 }: { name: string; size?: number }) => (
  <span
    className="flex shrink-0 items-center justify-center rounded-full bg-leaf-500 font-black uppercase text-white"
    style={{ width: size, height: size, fontSize: size * 0.42 }}
    aria-hidden
  >
    {[...name.trim()][0] ?? '?'}
  </span>
);

export default function FriendsScreen({ onLogin, onChat }: { onLogin: () => void; onChat: (open: boolean) => void }) {
  const acc = useAccount();
  const s = useSocial();
  const [view, setView] = useState<View>('friends');
  const [chat, setChat] = useState<string | null>(null); // friend uid
  const [msg, setMsg] = useState('');
  const friend = s.friends.find((f) => f.uid === chat) ?? null;
  useEffect(() => {
    onChat(!!friend);
    return () => onChat(false);
  }, [friend, onChat]);

  const run = async (fn: (a: Awaited<ReturnType<typeof api>>) => Promise<unknown>, done = '') => {
    setMsg('');
    try {
      await fn(await api());
      if (done) setMsg(done);
    } catch (e) {
      setMsg(errorText(e));
    }
  };

  const header = (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-100 text-coral-500">
        <FriendsIcon size={34} />
      </span>
      <div>
        <h1 className="text-2xl font-black">Bạn bè</h1>
        <p className="text-sm font-semibold text-ink-500">Kết bạn và nhắn tin cùng học. Chỉ bạn bè mới nhắn được cho nhau.</p>
      </div>
    </div>
  );

  if (!acc.user)
    return (
      <div className="mx-auto max-w-md px-4 pb-2 pt-4" data-testid="friends-guest">
        {header}
        <div className="card flex flex-col items-center gap-3 text-center">
          <Panda size={90} mood="happy" />
          <p className="font-bold text-ink-700">
            {firebaseConfigured ? 'Đăng nhập để kết bạn và nhắn tin. Bạn vẫn học đầy đủ mà không cần đăng nhập.' : NOT_CONFIGURED_MSG}
          </p>
          {firebaseConfigured && (
            <button type="button" className="btn-green" onClick={onLogin} data-testid="friends-login">
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    );

  if (friend) return <ChatView friend={friend} me={acc.user.uid} onBack={() => setChat(null)} />;

  const tabs: [View, string, number][] = [
    ['friends', 'Bạn bè', s.friends.reduce((n, f) => n + (s.chats[f.pairId]?.unread ? 1 : 0), 0)],
    ['requests', 'Lời mời', s.incoming.length],
    ['find', 'Tìm bạn', 0],
    ['blocked', 'Đã chặn', 0],
  ];
  return (
    <div className="mx-auto max-w-md px-4 pb-2 pt-4" data-testid="friends-screen">
      {header}
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-2xl bg-cloud/60 p-1">
        {tabs.map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setView(id);
              setMsg('');
            }}
            className={`relative rounded-xl py-2 text-sm font-extrabold ${view === id ? 'bg-white text-ink-700 shadow' : 'text-ink-400'}`}
            data-testid={`friends-tab-${id}`}
          >
            {label}
            {n > 0 && <span className="ml-1 rounded-full bg-coral-500 px-1.5 text-[11px] text-white">{n}</span>}
          </button>
        ))}
      </div>
      {s.error === 'rules' && <p className="mb-3 rounded-xl bg-sun-100 p-3 text-sm font-bold text-ink-700" data-testid="friends-rules-error">{RULES_MSG}</p>}
      {s.error === 'network' && <p className="mb-3 rounded-xl bg-sun-100 p-3 text-sm font-bold text-ink-700">Không kết nối được máy chủ. Hãy kiểm tra mạng.</p>}
      {msg && <p className="mb-3 rounded-xl bg-sky-500/10 p-3 text-sm font-bold text-ink-700" data-testid="friends-msg">{msg}</p>}
      {!s.ready && !s.error && <p className="font-bold text-ink-400">Đang tải…</p>}

      {view === 'friends' && s.ready && (
        <FriendList
          s={s}
          onOpen={(f) => setChat(f.uid)}
          onRemove={(f) => confirm(`Hủy kết bạn với ${f.name}?`) && run((a) => a.removeFriend(f), `Đã hủy kết bạn với ${f.name}.`)}
          onBlock={(f) =>
            confirm(`Chặn ${f.name}? Hai bạn sẽ không còn là bạn bè và người này không thể gửi lời mời cho bạn.`) &&
            run((a) => a.blockUser({ uid: f.uid, name: f.name }), `Đã chặn ${f.name}.`)
          }
          onFind={() => setView('find')}
        />
      )}

      {view === 'requests' && s.ready && (
        <div className="flex flex-col gap-2" data-testid="friends-requests">
          <h2 className="text-sm font-extrabold uppercase text-ink-400">Lời mời nhận được</h2>
          {s.incoming.length === 0 && <p className="font-bold text-ink-400">Chưa có lời mời nào.</p>}
          {s.incoming.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 !p-3" data-testid="request-in">
              <Avatar name={r.fromName} />
              <span className="min-w-0 flex-1 truncate font-extrabold text-ink-700">{r.fromName}</span>
              <button type="button" className="chip chip-active !py-1 !text-xs" onClick={() => run((a) => a.acceptRequest(r), `Bạn và ${r.fromName} đã là bạn bè.`)} data-testid="request-accept">
                Đồng ý
              </button>
              <button type="button" className="chip !py-1 !text-xs" onClick={() => run((a) => a.removeRequest(r))} data-testid="request-decline">
                Từ chối
              </button>
              <button
                type="button"
                className="chip !py-1 !text-xs !text-coral-500"
                onClick={() => confirm(`Chặn ${r.fromName}?`) && run((a) => a.blockUser({ uid: r.from, name: r.fromName }), `Đã chặn ${r.fromName}.`)}
                data-testid="request-block"
              >
                Chặn
              </button>
            </div>
          ))}
          <h2 className="mt-3 text-sm font-extrabold uppercase text-ink-400">Lời mời đã gửi</h2>
          {s.outgoing.length === 0 && <p className="font-bold text-ink-400">Bạn chưa gửi lời mời nào.</p>}
          {s.outgoing.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 !p-3" data-testid="request-out">
              <Avatar name={r.toName} />
              <span className="min-w-0 flex-1 truncate font-extrabold text-ink-700">{r.toName}</span>
              <span className="text-xs font-bold text-ink-400">Đang chờ</span>
              <button type="button" className="chip !py-1 !text-xs" onClick={() => run((a) => a.removeRequest(r))} data-testid="request-cancel">
                Hủy
              </button>
            </div>
          ))}
        </div>
      )}

      {view === 'find' && <FindFriends s={s} me={acc.user.uid} run={run} />}

      {view === 'blocked' && s.ready && (
        <div className="flex flex-col gap-2" data-testid="friends-blocked">
          {s.blocked.length === 0 && <p className="font-bold text-ink-400">Bạn chưa chặn ai.</p>}
          {s.blocked.map((b) => (
            <div key={b.uid} className="card flex items-center gap-3 !p-3" data-testid="blocked-user">
              <Avatar name={b.name} />
              <span className="min-w-0 flex-1 truncate font-extrabold text-ink-700">{b.name}</span>
              <button type="button" className="chip !py-1 !text-xs" onClick={() => run((a) => a.unblockUser(b.uid), `Đã bỏ chặn ${b.name}.`)} data-testid="unblock">
                Bỏ chặn
              </button>
            </div>
          ))}
          <p className="text-xs font-bold text-ink-400">Người bị chặn không thể gửi lời mời kết bạn hay nhắn tin cho bạn.</p>
        </div>
      )}
    </div>
  );
}

function FriendList({ s, onOpen, onRemove, onBlock, onFind }: { s: SocialState; onOpen: (f: Friend) => void; onRemove: (f: Friend) => void; onBlock: (f: Friend) => void; onFind: () => void }) {
  const [menu, setMenu] = useState<string | null>(null);
  const list = [...s.friends].sort((a, b) => (s.chats[b.pairId]?.lastAt ?? 0) - (s.chats[a.pairId]?.lastAt ?? 0) || a.name.localeCompare(b.name, 'vi'));
  if (!list.length)
    return (
      <div className="card flex flex-col items-center gap-3 text-center" data-testid="friends-empty">
        <Panda size={80} mood="happy" />
        <p className="font-bold text-ink-500">Bạn chưa có người bạn nào. Hãy tìm bạn theo tên hiển thị và gửi lời mời!</p>
        <button type="button" className="btn-green" onClick={onFind}>
          Tìm bạn
        </button>
      </div>
    );
  return (
    <div className="flex flex-col gap-2" data-testid="friends-list">
      {list.map((f) => {
        const c = s.chats[f.pairId];
        return (
          <div key={f.uid} className="card !p-0" data-testid="friend">
            <div className="flex items-center gap-3 p-3">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpen(f)} data-testid="friend-open">
                <Avatar name={f.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-extrabold text-ink-700">{f.name}</span>
                    <span className="shrink-0 text-xs font-bold text-ink-400">{shortTime(c?.lastAt ?? 0)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-sm ${c?.unread ? 'font-extrabold text-ink-700' : 'font-semibold text-ink-400'}`}>
                      {c?.lastText ? `${c.lastFrom === f.uid ? '' : 'Bạn: '}${c.lastText}` : 'Nhấn để nhắn tin'}
                    </span>
                    {!!c?.unread && (
                      <span className="shrink-0 rounded-full bg-coral-500 px-2 text-xs font-black leading-5 text-white" data-testid="friend-unread">
                        {c.unread > 99 ? '99+' : c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
              <button type="button" className="px-2 text-xl font-black text-ink-300" aria-label={`Tùy chọn cho ${f.name}`} onClick={() => setMenu(menu === f.uid ? null : f.uid)} data-testid="friend-menu">
                ⋯
              </button>
            </div>
            {menu === f.uid && (
              <div className="flex gap-2 border-t-2 border-cloud p-2">
                <button type="button" className="chip flex-1 !py-1 !text-xs" onClick={() => onRemove(f)} data-testid="friend-remove">
                  Hủy kết bạn
                </button>
                <button type="button" className="chip flex-1 !py-1 !text-xs !text-coral-500" onClick={() => onBlock(f)} data-testid="friend-block">
                  Chặn
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FindFriends({ s, me, run }: { s: SocialState; me: string; run: (fn: (a: Awaited<ReturnType<typeof api>>) => Promise<unknown>, done?: string) => Promise<void> }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<FoundUser[] | null>(null);
  const [busy, setBusy] = useState(false);
  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true);
    try {
      setFound(await (await api()).searchUsers(q));
    } catch {
      setFound([]);
    } finally {
      setBusy(false);
    }
  };
  const status = (u: FoundUser) =>
    s.friends.some((f) => f.uid === u.uid) ? 'friend' : s.outgoing.some((r) => r.to === u.uid) ? 'sent' : s.incoming.some((r) => r.from === u.uid) ? 'incoming' : s.blocked.some((b) => b.uid === u.uid) ? 'blocked' : 'none';
  return (
    <div data-testid="friends-find">
      <form
        className="mb-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <input className="input min-w-0 flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập tên hiển thị (từ 2 ký tự)" aria-label="Tìm theo tên hiển thị" maxLength={40} data-testid="find-input" />
        <button type="submit" className="chip chip-active" disabled={busy || q.trim().length < 2} data-testid="find-submit">
          Tìm
        </button>
      </form>
      {busy && <p className="font-bold text-ink-400">Đang tìm…</p>}
      {found && !busy && found.length === 0 && <p className="font-bold text-ink-400" data-testid="find-empty">Không tìm thấy ai có tên bắt đầu bằng “{q.trim()}”.</p>}
      <div className="flex flex-col gap-2">
        {found?.map((u) => {
          const st = status(u);
          return (
            <div key={u.uid} className="card flex items-center gap-3 !p-3" data-testid="found-user">
              <Avatar name={u.name} />
              <span className="min-w-0 flex-1 truncate font-extrabold text-ink-700">{u.name}</span>
              {st === 'none' && u.uid !== me && (
                <button type="button" className="chip chip-active !py-1 !text-xs" onClick={() => run((a) => a.sendRequest(u), `Đã gửi lời mời kết bạn tới ${u.name}.`)} data-testid="add-friend">
                  Kết bạn
                </button>
              )}
              {st !== 'none' && (
                <span className="text-xs font-bold text-ink-400" data-testid="found-status">
                  {st === 'friend' ? 'Đã là bạn' : st === 'sent' ? 'Đã gửi lời mời' : st === 'incoming' ? 'Đã mời bạn' : 'Đã chặn'}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs font-bold text-ink-400">Tìm theo phần đầu của tên hiển thị. Tên của bạn được đặt trong Hồ sơ.</p>
    </div>
  );
}

function ChatView({ friend, me, onBack }: { friend: Friend; me: string; onBack: () => void }) {
  const s = useSocial();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reported, setReported] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gp-reported') || '[]');
    } catch {
      return [];
    }
  });
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const pair = friend.pairId;
  const uid = friend.uid;
  const name = friend.name;

  useEffect(() => {
    let stop = () => {};
    let alive = true;
    api()
      .then((a) => {
        if (!alive) return;
        stop = a.watchMessages(
          { uid, name, pairId: pair, since: 0 },
          (m) => {
            setMessages(m);
            setError('');
          },
          (kind) => setError(kind === 'rules' ? RULES_MSG : 'Không tải được tin nhắn. Hãy kiểm tra kết nối mạng.'),
        );
      })
      .catch((e) => setError(errorText(e)));
    return () => {
      alive = false;
      stop();
    };
  }, [pair, uid, name]);

  const unread = s.chats[pair]?.unread ?? 0;
  const count = messages?.length ?? 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [count]);
  useEffect(() => {
    if (unread) void api().then((a) => a.markRead({ uid, name, pairId: pair, since: 0 }));
  }, [unread, count, pair, uid, name]);

  const send = async () => {
    const clean = cleanMessage(text);
    if (!clean) return;
    setText('');
    setEmoji(false);
    setNote('');
    try {
      await (await api()).sendMessage(friend, clean);
    } catch (e) {
      setText(clean);
      setNote((e as { code?: string }).code === 'permission-denied' ? 'Không gửi được: hai bạn không còn là bạn bè.' : errorText(e));
    }
  };
  const report = async (m: Message) => {
    const reason = prompt('Vì sao bạn báo cáo tin nhắn này? (không bắt buộc)', '');
    if (reason === null) return;
    try {
      await (await api()).reportMessage(friend, m, reason);
      setNote('Đã gửi báo cáo cho quản trị viên. Cảm ơn bạn!');
    } catch (e) {
      setNote((e as { code?: string }).code === 'permission-denied' ? 'Tin nhắn này đã được báo cáo.' : errorText(e));
    }
    const next = [...new Set([...reported, m.id])].slice(-500);
    setReported(next);
    localStorage.setItem('gp-reported', JSON.stringify(next));
    setSel(null);
  };
  const remove = async (m: Message) => {
    if (!confirm('Xóa tin nhắn này?')) return;
    await (await api()).deleteMessage(friend, m).catch((e) => setNote(errorText(e)));
    setSel(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-surface" data-testid="chat-view">
      <header className="border-b-2 border-cloud bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-3">
          <button type="button" onClick={onBack} className="text-ink-400" aria-label="Quay lại" data-testid="chat-back">
            <Chevron dir="left" size={26} />
          </button>
          <Avatar name={friend.name} size={36} />
          <h1 className="min-w-0 flex-1 truncate text-lg font-black text-ink-700" data-testid="chat-name">
            {friend.name}
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-md flex-col gap-1.5 px-3 py-3" data-testid="chat-messages">
          {error && <p className="rounded-xl bg-sun-100 p-3 text-sm font-bold text-ink-700">{error}</p>}
          {!messages && !error && <p className="text-center font-bold text-ink-400">Đang tải…</p>}
          {messages?.length === 0 && <p className="py-6 text-center font-bold text-ink-400">Hãy gửi lời chào đầu tiên! 👋</p>}
          {messages?.map((m, i) => {
            const mine = m.from === me;
            const newDay = i === 0 || !sameDay(messages[i - 1].at, m.at);
            return (
              <div key={m.id}>
                {newDay && <div className="my-2 text-center text-xs font-extrabold text-ink-400">{dayOf(m.at)}</div>}
                <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <button
                    type="button"
                    onClick={() => setSel(sel === m.id ? null : m.id)}
                    data-testid={mine ? 'msg-mine' : 'msg-theirs'}
                    className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-left text-[15px] font-semibold ${
                      m.hidden ? 'bg-cloud italic text-ink-400' : mine ? 'bg-leaf-500 text-white' : 'border-2 border-cloud bg-white text-ink-700'
                    }`}
                  >
                    {m.hidden ? 'Tin nhắn đã bị quản trị viên ẩn.' : m.text}
                  </button>
                  <span className="mt-0.5 px-1 text-[11px] font-bold text-ink-400" data-testid="msg-time">
                    {timeOf(m.at)}
                    {reported.includes(m.id) && !mine && ' · đã báo cáo'}
                  </span>
                  {sel === m.id && !m.hidden && (
                    <div className="mt-1 flex gap-2">
                      {mine ? (
                        <button type="button" className="chip !py-1 !text-xs !text-coral-500" onClick={() => remove(m)} data-testid="msg-delete">
                          Xóa tin nhắn
                        </button>
                      ) : (
                        <button type="button" className="chip !py-1 !text-xs !text-coral-500" onClick={() => report(m)} data-testid="msg-report">
                          Báo cáo tin nhắn
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottom} />
        </div>
      </div>

      <div className="border-t-2 border-cloud bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md px-3 py-2">
          {note && <p className="mb-2 text-center text-xs font-bold text-coral-500" data-testid="chat-note">{note}</p>}
          {emoji && (
            <div className="mb-2 grid grid-cols-10 gap-1" data-testid="emoji-picker">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="rounded-lg py-1 text-2xl hover:bg-mist"
                  onClick={() => {
                    setText((t) => (t + e).slice(0, MAX_MESSAGE));
                    input.current?.focus();
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button type="button" className="h-11 w-11 shrink-0 rounded-xl bg-mist text-2xl" onClick={() => setEmoji(!emoji)} aria-label="Chọn biểu tượng cảm xúc" data-testid="emoji-toggle">
              😊
            </button>
            <textarea
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_MESSAGE))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Nhắn tin (chữ và emoji)…"
              aria-label="Nội dung tin nhắn"
              data-testid="chat-input"
              className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none rounded-2xl border-2 border-cloud bg-mist px-3 py-2 font-semibold text-ink-700 outline-none focus:border-sky-400"
            />
            <button type="button" className={`h-11 shrink-0 rounded-xl px-4 font-extrabold text-white ${cleanMessage(text) ? 'bg-leaf-500' : 'bg-cloud'}`} disabled={!cleanMessage(text)} onClick={send} data-testid="chat-send">
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
