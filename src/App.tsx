import { useEffect, useState } from 'react';
import TopBar from './components/TopBar';
import BottomNav, { type Tab } from './components/BottomNav';
import PathScreen from './screens/PathScreen';
import ReviewScreen from './screens/ReviewScreen';
import WordsScreen from './screens/WordsScreen';
import ProfileScreen from './screens/ProfileScreen';
import LessonScreen, { type SessionMode } from './screens/LessonScreen';
import { useProgress } from './lib/store';
import { dueCount } from './lib/srs';

const TABS: Tab[] = ['learn', 'review', 'words', 'profile'];
const tabFromHash = (): Tab => {
  const h = window.location.hash.replace('#/', '') as Tab;
  return TABS.includes(h) ? h : 'learn';
};

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [session, setSession] = useState<SessionMode | null>(null);
  const p = useProgress();

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const changeTab = (t: Tab) => {
    window.location.hash = `/${t}`;
    setTab(t);
    window.scrollTo(0, 0);
  };

  if (session)
    return (
      <LessonScreen
        key={JSON.stringify(session)}
        mode={session}
        onExit={() => {
          setSession(null);
          window.scrollTo(0, 0);
        }}
      />
    );

  return (
    <div className="min-h-[100dvh] bg-white">
      <TopBar />
      {tab === 'learn' && <PathScreen onStart={(id) => setSession({ type: 'lesson', lessonId: id })} />}
      {tab === 'review' && <ReviewScreen onStart={() => setSession({ type: 'review' })} />}
      {tab === 'words' && <WordsScreen />}
      {tab === 'profile' && <ProfileScreen />}
      <BottomNav tab={tab} onChange={changeTab} badge={Math.min(dueCount(p), 10)} />
    </div>
  );
}
