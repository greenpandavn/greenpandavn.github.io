import { useEffect, useState } from 'react';
import Panda from '../components/Panda';
import { Trophy } from '../components/Icons';
import { loadCloud, useAccount } from '../lib/account';
import type { Board } from '../lib/cloud';

const MEDAL = ['bg-sun-500', 'bg-[#c0c7cf]', 'bg-[#e0915a]'];

export default function LeaderboardScreen({ onLogin }: { onLogin: () => void }) {
  const acc = useAccount();
  const [kind, setKind] = useState<'week' | 'all'>('week');
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState(false);

  const synced = acc.sync === 'saved';
  useEffect(() => {
    let alive = true;
    setBoard(null);
    setError(false);
    loadCloud()
      .then((m) => m.fetchBoard(kind))
      .then((b) => alive && setBoard(b))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [kind, acc.user?.uid, synced]);

  const uid = acc.user?.uid;
  return (
    <div className="mx-auto max-w-md px-4 pb-2 pt-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sun-100 text-sun-600">
          <Trophy size={34} />
        </span>
        <div>
          <h1 className="text-2xl font-black">Bảng xếp hạng</h1>
          <p className="text-sm font-semibold text-ink-500">Top 20 theo XP · thi đua cùng bạn bè</p>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-cloud/60 p-1">
        {(['week', 'all'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-xl py-2.5 font-extrabold ${kind === k ? 'bg-white text-ink-700 shadow' : 'text-ink-400'}`}
            data-testid={`board-${k}`}
          >
            {k === 'week' ? 'Tuần này' : 'Mọi thời đại'}
          </button>
        ))}
      </div>

      {!acc.user && (
        <div className="card mb-4 flex items-center gap-3 !bg-sky-500/10">
          <p className="flex-1 text-sm font-bold text-ink-700">Bạn đang xem ở chế độ chỉ đọc. Đăng nhập để có tên trên bảng xếp hạng!</p>
          <button type="button" className="chip !text-sky-600" onClick={onLogin}>
            Đăng nhập
          </button>
        </div>
      )}

      {error ? (
        <Empty text="Không tải được bảng xếp hạng. Hãy kiểm tra kết nối mạng rồi thử lại." />
      ) : !board ? (
        <div className="flex flex-col gap-2" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-cloud/60" />
          ))}
        </div>
      ) : board.rows.length === 0 ? (
        <Empty text={kind === 'week' ? 'Tuần này chưa có ai ghi điểm. Hãy học một bài để dẫn đầu nhé!' : 'Chưa có ai trên bảng xếp hạng. Hãy là người đầu tiên!'} />
      ) : (
        <ol className="flex flex-col gap-2" data-testid="board-list">
          {board.rows.map((r, i) => (
            <li key={r.uid} className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 ${r.uid === uid ? 'border-sky-400 bg-sky-500/10' : 'border-cloud'}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${i < 3 ? `${MEDAL[i]} text-white` : 'text-ink-400'}`}>{i + 1}</span>
              <span className="flex-1 truncate font-extrabold">
                {r.displayName}
                {r.uid === uid && <span className="ml-1 text-xs text-sky-600">(bạn)</span>}
              </span>
              <span className="font-black text-sun-600">{r.xp} XP</span>
            </li>
          ))}
        </ol>
      )}
      {board?.me && !board.rows.some((r) => r.uid === uid) && (
        <div className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-sky-400 bg-sky-500/10 px-3 py-2.5" data-testid="my-rank">
          <span className="w-8 text-center text-sm font-black text-ink-500">#{board.me.rank}</span>
          <span className="flex-1 font-extrabold">Hạng của bạn</span>
          <span className="font-black text-sun-600">{board.me.xp} XP</span>
        </div>
      )}
      {board?.me && board.rows.some((r) => r.uid === uid) && (
        <p className="mt-3 text-center text-sm font-bold text-ink-500" data-testid="my-rank">
          Bạn đang đứng hạng #{board.me.rank}
        </p>
      )}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div className="flex flex-col items-center py-8 text-center" data-testid="board-empty">
    <Panda size={110} mood="happy" />
    <p className="mt-3 max-w-[280px] font-bold text-ink-500">{text}</p>
  </div>
);
