import BrowserNotice from './components/BrowserNotice';
import { NO_AUDIO_MSG, browserNoticeSeen, markBrowserNoticeSeen, unsupportedBrowser } from './lib/browser';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import BottomNav, { SocialTabs, type Tab } from './components/BottomNav';
import PathScreen from './screens/PathScreen';
import Footer from './components/Footer';
import AppBanners from './components/AppBanners';
import type { SessionMode } from './screens/LessonScreen';
import DataGate from './components/DataGate';
import ScrollButtons from './components/ScrollButtons';
import { currentLessonId } from './lib/unlock';
import { useProgress } from './lib/store';
import { dueCount } from './lib/srs';
import { everSignedIn, useAccount } from './lib/account';
import { LESSON_BY_ID, courseChosen, isEnglish, loadUnits, setCourse, unitsOfWords, useContentVersion } from './data';
import CoursePicker from './components/CoursePicker';
import { socialBadge, useSocial } from './lib/socialState';
import LevelPicker from './components/LevelPicker';

// Only the lesson path is in the first download; the other screens are fetched when they are opened
// (and ahead of time while the app is idle, see the effect in App).
const screens = {
  lesson: () => import('./screens/LessonScreen'),
  review: () => import('./screens/ReviewScreen'),
  words: () => import('./screens/WordsScreen'),
  profile: () => import('./screens/ProfileScreen'),
  rank: () => import('./screens/LeaderboardScreen'),
  friends: () => import('./screens/FriendsScreen'),
  auth: () => import('./screens/AuthScreen'),
  mock: () => import('./screens/MockScreen'),
};
const LessonScreen = lazy(screens.lesson);
const ReviewScreen = lazy(screens.review);
const WordsScreen = lazy(screens.words);
const ProfileScreen = lazy(screens.profile);
const LeaderboardScreen = lazy(screens.rank);
const FriendsScreen = lazy(screens.friends);
const AuthScreen = lazy(screens.auth);
const MockScreen = lazy(screens.mock);
const AdminScreen = lazy(() => import('./admin/AdminScreen'));
const Loading = () => (
  <div className="flex min-h-[60dvh] items-center justify-center" data-testid="screen-loading">
    <span className="h-10 w-10 animate-spin rounded-full border-4 border-cloud border-t-leaf-500" aria-hidden />
  </div>
);
const idle = (fn: () => void) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));

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
  // After the first paint, while idle: fetch the part being studied (so the next lesson starts at once), then the other screens.
  const cur = currentLessonId(p);
  const curUnit = cur ? LESSON_BY_ID[cur]?.unit : undefined;
  const picked = courseChosen() || !!p.settings.level;
  useEffect(() => {
    if (!picked || curUnit === undefined) return;
    idle(() => {
      loadUnits([curUnit]).catch(() => {});
      screens.lesson().catch(() => {});
    });
  }, [picked, curUnit, contentVersion]);
  useEffect(() => {
    const t = setTimeout(() => idle(() => Object.values(screens).forEach((load) => load().catch(() => {}))), 3000);
    return () => clearTimeout(t);
  }, []);
  const social = useSocial();
  const [chatOpen, setChatOpen] = useState(false);

  // Sound that could not be played: a dialog the first time, then (once the learner has read it) a short toast.
  const [ttsError, setTtsError] = useState<'dialog' | 'toast' | null>(null);
  const audioWarned = useRef(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const onErr = () => {
      if (!audioWarned.current) return setTtsError('dialog');
      setTtsError((cur) => (cur === 'dialog' ? cur : 'toast'));
      clearTimeout(t);
      t = setTimeout(() => setTtsError((cur) => (cur === 'toast' ? null : cur)), 5000);
    };
    window.addEventListener('tts-error', onErr);
    return () => window.removeEventListener('tts-error', onErr);
  }, []);
  // Cốc Cốc and in-app browsers (Zalo, Facebook) have no voices: say so once per session when the app opens.
  const [browserNotice, setBrowserNotice] = useState(() => !!unsupportedBrowser() && !browserNoticeSeen());
  const voiceHint = <>Thiết bị chưa có giọng đọc {isEnglish() ? 'tiếng Anh' : 'tiếng Trung'}: hãy cài giọng {isEnglish() ? '“English (United States)”' : '“Chinese (China)”'} trong cài đặt hệ thống, hoặc dùng Chrome/Safari/Edge.</>;
  const toast = (
    <>
      {ttsError === 'toast' && (
        <div role="alert" data-testid="tts-toast" className="pointer-events-none fixed inset-x-3 bottom-24 z-[60] mx-auto max-w-md animate-pop rounded-2xl bg-ink-700 px-4 py-3 text-sm font-bold text-white shadow-lg">
          {unsupportedBrowser() ? NO_AUDIO_MSG : <>Không phát được âm thanh. {voiceHint}</>}
        </div>
      )}
      {ttsError === 'dialog' && (
        <BrowserNotice
          kind="audio"
          extra={voiceHint}
          onClose={() => {
            audioWarned.current = true;
            setTtsError(null);
          }}
        />
      )}
      {browserNotice && ttsError !== 'dialog' && (
        <BrowserNotice
          kind="load"
          onClose={() => {
            markBrowserNoticeSeen();
            setBrowserNotice(false);
          }}
        />
      )}
    </>
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
        <Suspense fallback={<Loading />}>
          <AuthScreen
            onClose={() => {
              setAuthOpen(false);
              changeTab(prevTab.current);
            }}
          />
        </Suspense>
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

  // A guest's progress is on this device, so nothing has to be waited for. After a login the cloud copy may still arrive.
  const settled = acc.ready ? acc.sync !== 'saving' : !everSignedIn();

  // 'Thi thử HSK' is a standalone, optional section (no gate, guests included).
  if (mockOpen && !session)
    return (
      <>
        {toast}
        <Suspense fallback={<Loading />}>
          <MockScreen onClose={() => changeTab('learn')} />
        </Suspense>
      </>
    );

  // First launch: pick a course. Learners from before v3 already study Chinese and are not asked.
  if (!courseChosen() && !p.settings.level && !session && settled)
    return (
      <>
        {toast}
        <CoursePicker />
      </>
    );

  // First launch of a course: self-select a starting level (guests included – no login needed).
  if (!p.settings.level && !session && settled)
    return (
      <>
        {toast}
        <LevelPicker />
      </>
    );

  if (session) {
    // a lesson or a part test needs its part; a review needs every part with practised words
    const need = session.type === 'lesson' ? [LESSON_BY_ID[session.lessonId]?.unit ?? 0] : session.type === 'test' ? [session.unit] : unitsOfWords(Object.keys(p.words));
    return (
      <>
        {toast}
        <DataGate units={need}>
          <Suspense fallback={<Loading />}>
            <LessonScreen
              key={JSON.stringify(session)}
              mode={session}
              onExit={() => {
                setSession(null);
                window.scrollTo(0, 0);
              }}
            />
          </Suspense>
        </DataGate>
      </>
    );
  }

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
      <Suspense fallback={<Loading />}>
      {tab === 'review' && (
        <DataGate units={unitsOfWords(Object.keys(p.words))}>
          <ReviewScreen onStart={() => setSession({ type: 'review' })} />
        </DataGate>
      )}
      {tab === 'words' && <WordsScreen />}
      {(tab === 'rank' || (tab === 'friends' && !chatOpen)) && <SocialTabs tab={tab} onChange={changeTab} friendsBadge={acc.user ? socialBadge(social) : 0} />}
      {tab === 'friends' && <FriendsScreen onLogin={openAuth} onChat={setChatOpen} />}
      {tab === 'rank' && <LeaderboardScreen onLogin={openAuth} />}
      {tab === 'profile' && <ProfileScreen onLogin={openAuth} onAdmin={openAdmin} />}
      </Suspense>
      {!(tab === 'friends' && chatOpen) && <Footer className="pb-24" />}
      {!(tab === 'friends' && chatOpen) && <ScrollButtons />}
      {!(tab === 'friends' && chatOpen) && <BottomNav tab={tab} onChange={changeTab} badge={Math.min(dueCount(p), 10)} friendsBadge={acc.user ? socialBadge(social) : 0} />}
    </div>
  );
}
