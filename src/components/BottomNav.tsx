import { BookIcon, Friends, Home, Refresh, Trophy, User } from './Icons';


export type Tab = 'learn' | 'review' | 'words' | 'friends' | 'rank' | 'profile';

/** The nav has five entries; "Cộng đồng" groups the Friends and Leaderboard tabs. */
const SOCIAL: Tab[] = ['friends', 'rank'];
let lastSocial: Tab = 'rank';

const TABS: { id: Tab; label: string; Icon: typeof Home; color: string }[] = [
  { id: 'learn', label: 'Học', Icon: Home, color: 'text-leaf-500' },
  { id: 'review', label: 'Ôn tập', Icon: Refresh, color: 'text-grape-500' },
  { id: 'words', label: 'Từ vựng', Icon: BookIcon, color: 'text-sky-500' },
  { id: 'friends', label: 'Cộng đồng', Icon: Friends, color: 'text-coral-500' },
  { id: 'profile', label: 'Hồ sơ', Icon: User, color: 'text-[#ff9600]' },
];

export default function BottomNav({ tab, onChange, badge, friendsBadge }: { tab: Tab; onChange: (t: Tab) => void; badge?: number; friendsBadge?: number }) {
  if (SOCIAL.includes(tab)) lastSocial = tab;
  const active = (id: Tab) => tab === id || (id === 'friends' && SOCIAL.includes(tab));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-cloud bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(({ id, label, Icon, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id === 'friends' ? (friendsBadge ? 'friends' : lastSocial) : id)}
            data-testid={id === 'friends' ? 'tab-social' : `tab-${id}`}
            className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-[11.5px] font-extrabold ${
              active(id) ? color : 'text-ink-300'
            }`}
            aria-current={active(id) ? 'page' : undefined}
          >
            <span className={`rounded-xl px-2 py-1 ${active(id) ? 'bg-current/10 ring-2 ring-current/30' : ''}`}>
              <Icon size={26} />
            </span>
            {label}
            {((id === 'review' && !!badge) || (id === 'friends' && !!friendsBadge)) && (
              <span
                className="absolute right-[14%] top-1.5 min-w-[20px] rounded-full bg-coral-500 px-1.5 text-[11px] leading-5 text-white"
                data-testid={`badge-${id}`}
              >
                {(id === 'review' ? badge! : friendsBadge!) > 99 ? '99+' : id === 'review' ? badge : friendsBadge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** Switcher shown at the top of the "Cộng đồng" area. */
export function SocialTabs({ tab, onChange, friendsBadge }: { tab: Tab; onChange: (t: Tab) => void; friendsBadge?: number }) {
  const items: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: 'friends', label: 'Bạn bè & tin nhắn', Icon: Friends },
    { id: 'rank', label: 'Xếp hạng', Icon: Trophy },
  ];
  return (
    <div className="mx-auto grid max-w-md grid-cols-2 gap-2 px-4 pt-4" data-testid="social-tabs">
      {items.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          data-testid={`tab-${id}`}
          aria-current={tab === id ? 'page' : undefined}
          className={`relative flex items-center justify-center gap-1.5 rounded-2xl border-2 px-2 py-2 text-sm font-extrabold ${
            tab === id ? 'border-coral-400 bg-coral-50 text-coral-500' : 'border-cloud bg-white text-ink-400'
          }`}
        >
          <Icon size={20} />
          {label}
          {id === 'friends' && !!friendsBadge && (
            <span className="min-w-[20px] rounded-full bg-coral-500 px-1.5 text-[11px] leading-5 text-white" data-testid="badge-friends-sub">
              {friendsBadge > 99 ? '99+' : friendsBadge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
