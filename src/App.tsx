import { useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import BottomNav, { type Tab } from './components/BottomNav';
import PathScreen from './screens/PathScreen';
import ReviewScreen from './screens/ReviewScreen';
import WordsScreen from './screens/WordsScreen';
import ProfileScreen from './screens/ProfileScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AuthScreen from './screens/AuthScreen';
import Footer from './components/Footer';
import AppBanners from './components/AppBanners';
import LessonScreen, { type SessionMode } from './screens/LessonScreen';
import { useProgress } from './lib/store';
import { dueCount } from './lib/srs';

const TABS: Tab[] = ['learn', 'review', 'words', 'rank', 'profile'];
const tabFromHash = (): Tab => {
  const h = window.location.hash.replace('#/', '') as Tab;
  return TABS.includes(h) ? h : 'learn';
};

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const prevTab = useRef<Tab>('profile');
  const [authOpen, setAuthOpen] = useState(() => window.location.hash === '#/auth');
  const [session, setSession] = useState<SessionMode | null>(null);
  const p = useProgress();

  const [ttsError, setTtsError] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onErr = () => {
      setTtsError(true);
      clearTimeout(t);
      t = setTimeout(() => setTtsError(false), 5000);
    };
    window.addEventListener('tts-error', onErr);
    return () => window.removeEventListener('tts-error', onErr);
  }, []);
  const toast = ttsError && (
    <div role="alert" className="pointer-events-none fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-md animate-pop rounded-2xl bg-ink-700 px-4 py-3 text-sm font-bold text-white shadow-lg">
      Không phát được âm thanh: thiết bị chưa có giọng đọc tiếng Trung. Hãy cài giọng “Chinese (China)” trong cài đặt hệ thống, hoặc dùng Chrome/Safari/Edge.
    </div>
  );

  useEffect(() => {
    const onHash = () => {
      setTab(tabFromHash());
      setAuthOpen(window.location.hash === '#/auth');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const changeTab = (t: Tab) => {
    window.location.hash = `/${t}`;
    setTab(t);
    window.scrollTo(0, 0);
  };

  const openAuth = () => {
    prevTab.current = tab;
    window.location.hash = '/auth';
    setAuthOpen(true);
    window.scrollTo(0, 0);
  };

  if (authOpen && !session)
    return (
      <>
        {toast}
        <AuthScreen
          onClose={() => {
            setAuthOpen(false);
            changeTab(prevTab.current);
          }}
        />
      </>
    );

  if (session)
    return (
      <>
        {toast}
        <LessonScreen
        key={JSON.stringify(session)}
        mode={session}
        onExit={() => {
          setSession(null);
          window.scrollTo(0, 0);
        }}
      />
      </>
    );

  return (
    <div className="min-h-[100dvh] bg-white">
      {toast}
      <TopBar />
      <AppBanners onLearn={() => changeTab('learn')} />
      {tab === 'learn' && (
        <PathScreen onStart={(id) => setSession({ type: 'lesson', lessonId: id })} onTest={(unit) => setSession({ type: 'test', unit })} />
      )}
      {tab === 'review' && <ReviewScreen onStart={() => setSession({ type: 'review' })} />}
      {tab === 'words' && <WordsScreen />}
      {tab === 'rank' && <LeaderboardScreen onLogin={openAuth} />}
      {tab === 'profile' && <ProfileScreen onLogin={openAuth} />}
      <Footer className="pb-24" />
      <BottomNav tab={tab} onChange={changeTab} badge={Math.min(dueCount(p), 10)} />
    </div>
  );
}
