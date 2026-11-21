import { BookIcon, Friends, Home, Refresh, Trophy, User } from './Icons';

export type Tab = 'learn' | 'review' | 'words' | 'friends' | 'rank' | 'profile';

const TABS: { id: Tab; label: string; Icon: typeof Home; color: string }[] = [
  { id: 'learn', label: 'Học', Icon: Home, color: 'text-leaf-500' },
  { id: 'review', label: 'Ôn tập', Icon: Refresh, color: 'text-grape-500' },
  { id: 'words', label: 'Từ vựng', Icon: BookIcon, color: 'text-sky-500' },
  { id: 'friends', label: 'Bạn bè', Icon: Friends, color: 'text-coral-500' },
  { id: 'rank', label: 'Xếp hạng', Icon: Trophy, color: 'text-sun-600' },
  { id: 'profile', label: 'Hồ sơ', Icon: User, color: 'text-[#ff9600]' },
];

export default function BottomNav({ tab, onChange, badge, friendsBadge }: { tab: Tab; onChange: (t: Tab) => void; badge?: number; friendsBadge?: number }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-cloud bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-6">
        {TABS.map(({ id, label, Icon, color }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            data-testid={`tab-${id}`}
            className={`relative flex h-16 flex-col items-center justify-center gap-0.5 text-[10.5px] font-extrabold ${
              tab === id ? color : 'text-ink-300'
            }`}
            aria-current={tab === id ? 'page' : undefined}
          >
            <span className={`rounded-xl px-2 py-1 ${tab === id ? 'bg-current/10 ring-2 ring-current/30' : ''}`}>
              <Icon size={26} />
            </span>
            {label}
            {((id === 'review' && !!badge) || (id === 'friends' && !!friendsBadge)) && (
              <span
                className="absolute right-[10%] top-1.5 min-w-[20px] rounded-full bg-coral-500 px-1.5 text-[11px] leading-5 text-white"
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
