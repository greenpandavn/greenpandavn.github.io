import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import BottomNav, { SocialTabs, type Tab } from './components/BottomNav';
import PathScreen from './screens/PathScreen';
import ReviewScreen from './screens/ReviewScreen';
import WordsScreen from './screens/WordsScreen';
import ProfileScreen from './screens/ProfileScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import AuthScreen from './screens/AuthScreen';
import Footer from './components/Footer';
import AppBanners from './components/AppBanners';
import LessonScreen, { type SessionMode } from './screens/LessonScreen';
import ScrollButtons from './components/ScrollButtons';
import { currentLessonId } from './lib/unlock';
import { useProgress } from './lib/store';
import { dueCount } from './lib/srs';
import { useAccount } from './lib/account';
import { LESSON_BY_ID, courseChosen, courseLoaded, courseState, ensureCourse, isEnglish, noteLevel, retryCourse, setCourse, unitLevel, useContentVersion } from './data';
import CoursePicker from './components/CoursePicker';
import MockScreen from './screens/MockScreen';
import FriendsScreen from './screens/FriendsScreen';
import { socialBadge, useSocial } from './lib/socialState';
import LevelPicker from './components/LevelPicker';

const AdminScreen = lazy(() => import('./admin/AdminScreen'));

const TABS: Tab[] = ['learn', 'review', 'words', 'friends', 'rank', 'profile'];
const tabFromHash = (): Tab => {
  const h = window.location.hash.replace('#/', '') as Tab;
  return TABS.includes(h) ? h : 'learn';
};

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const prevTab = useRef<Tab>('profile');
  const [authOpen, setAuthOpen] = useState(() => window.location.hash === '#/auth');
  const [adminOpen, setAdminOpen] = useState(() => window.location.hash === '#/admin');
  const [mockOpen, setMockOpen] = useState(() => window.location.hash === '#/mock');
  const acc = useAccount();
  const [session, setSession] = useState<SessionMode | null>(null);
  useEffect(() => {
    // the admin area manages the Chinese course content only
    if (adminOpen && acc.role === 'admin' && isEnglish()) setCourse('zh');
  }, [adminOpen, acc.role]);
  const p = useProgress();
  const contentVersion = useContentVersion();
  useEffect(() => {
    if (!courseChosen() && !p.settings.level) return; // nothing is downloaded before a course is picked
    ensureCourse();
    // once every level is known, remember which level is being studied (it is loaded first next time)
    if (!courseLoaded()) return;
    const cur = currentLessonId(p);
    if (cur && LESSON_BY_ID[cur]) noteLevel(unitLevel(LESSON_BY_ID[cur].unit));
  }, [p, contentVersion]);
  const social = useSocial();
  const [chatOpen, setChatOpen] = useState(false);

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
      Không phát được âm thanh: thiết bị chưa có giọng đọc {isEnglish() ? 'tiếng Anh' : 'tiếng Trung'}. Hãy cài giọng {isEnglish() ? '“English (United States)”' : '“Chinese (China)”'} trong cài đặt hệ thống, hoặc dùng Chrome/Safari/Edge.
    </div>
  );

  useEffect(() => {
    const onHash = () => {
      setTab(tabFromHash());
      setAuthOpen(window.location.hash === '#/auth');
      setAdminOpen(window.location.hash === '#/admin');
      setMockOpen(window.location.hash === '#/mock');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const changeTab = (t: Tab) => {
    window.location.hash = `/${t}`;
    setTab(t);
    setMockOpen(false);
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

  const openAdmin = () => {
    window.location.hash = '/admin';
    setAdminOpen(true);
    window.scrollTo(0, 0);
  };

  if (adminOpen && !session && acc.role === 'admin')
    return (
      <Suspense fallback={<p className="p-6 text-center font-bold text-ink-400">Đang tải trang quản trị…</p>}>
        <AdminScreen onClose={() => changeTab('profile')} />
      </Suspense>
    );

  // The lessons of each course are a separate download: wait for the active course before showing it.
  // (the mock papers need every level, the lessons only the levels in use)
  if ((mockOpen || courseChosen() || p.settings.level) && (courseState() !== 'ready' || (mockOpen && !courseLoaded()))) {
    ensureCourse();
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center" data-testid="course-loading">
        {courseState() === 'error' ? (
          <>
            <p className="font-bold text-ink-500">Không tải được dữ liệu khóa học. Hãy kiểm tra kết nối mạng rồi thử lại.</p>
            <button className="btn-primary" onClick={retryCourse}>
              Thử lại
            </button>
          </>
        ) : (
          <p className="font-bold text-ink-400">Đang tải khóa học…</p>
        )}
      </div>
    );
  }

  // 'Thi thử HSK' is a standalone, optional section (no gate, guests included).
  if (mockOpen && !session)
    return (
      <>
        {toast}
        <MockScreen onClose={() => changeTab('learn')} />
      </>
    );

  // First launch: pick a course. Learners from before v3 already study Chinese and are not asked.
  if (!courseChosen() && !p.settings.level && !session && acc.ready && acc.sync !== 'saving')
    return (
      <>
        {toast}
        <CoursePicker />
      </>
    );

  // First launch of a course: self-select a starting level (guests included – no login needed).
  if (!p.settings.level && !session && acc.ready && acc.sync !== 'saving')
    return (
      <>
        {toast}
        <LevelPicker />
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
    <div className="min-h-[100dvh] bg-surface">
      {toast}
      <TopBar />
      <AppBanners onLearn={() => changeTab('learn')} />
      {tab === 'learn' && (
        <PathScreen
          onStart={(id) => setSession({ type: 'lesson', lessonId: id })}
          onTest={(unit) => setSession({ type: 'test', unit })}
          onMock={() => {
            window.location.hash = '/mock';
            setMockOpen(true);
            window.scrollTo(0, 0);
          }}
        />
      )}
      {tab === 'review' && <ReviewScreen onStart={() => setSession({ type: 'review' })} />}
      {tab === 'words' && <WordsScreen />}
      {(tab === 'rank' || (tab === 'friends' && !chatOpen)) && <SocialTabs tab={tab} onChange={changeTab} friendsBadge={acc.user ? socialBadge(social) : 0} />}
      {tab === 'friends' && <FriendsScreen onLogin={openAuth} onChat={setChatOpen} />}
      {tab === 'rank' && <LeaderboardScreen onLogin={openAuth} />}
      {tab === 'profile' && <ProfileScreen onLogin={openAuth} onAdmin={openAdmin} />}
      {!(tab === 'friends' && chatOpen) && <Footer className="pb-24" />}
      {!(tab === 'friends' && chatOpen) && <ScrollButtons />}
      {!(tab === 'friends' && chatOpen) && <BottomNav tab={tab} onChange={changeTab} badge={Math.min(dueCount(p), 10)} friendsBadge={acc.user ? socialBadge(social) : 0} />}
    </div>
  );
}
