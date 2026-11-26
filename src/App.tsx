import BrowserNotice from './components/BrowserNotice';
import { NO_AUDIO_MSG, browserNoticeSeen, markBrowserNoticeSeen, unsupportedBrowser } from './lib/browser';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import TopBar from './components/TopBar';
import BottomNav, { SocialTabs, type Tab } from './components/BottomNav';
import PathScreen from './screens/PathScreen';
import Footer from './components/Footer';
import AppBanners from './components/AppBanners';
import SessionNotice from './components/SessionNotice';
import type { SessionMode } from './screens/LessonScreen';
import DataGate from './components/DataGate';
import ScrollButtons from './components/ScrollButtons';
import { currentLessonId } from './lib/unlock';
import { useProgress } from './lib/store';
import { dueCount } from './lib/srs';
import { everSignedIn, firebaseConfigured, useAccount } from './lib/account';
import AnnouncementPanel from './components/AnnouncementPanel';
import LoginGate from './components/LoginGate';
import { needsLogin } from './lib/gate';
import { partVip, useVip, useVipParts, vipCourse } from './lib/vip';
import VipGate from './components/VipGate';
import { COURSE_LANG, VOICE_PACK } from './lib/speech';
import { LESSON_BY_ID, courseChosen, getCourse, langName, loadUnits, setCourse, unitsOfWords, useContentVersion } from './data';
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
  game: () => import('./screens/GameScreen'),
};
const LessonScreen = lazy(screens.lesson);
const ReviewScreen = lazy(screens.review);
const WordsScreen = lazy(screens.words);
const ProfileScreen = lazy(screens.profile);
const LeaderboardScreen = lazy(screens.rank);
const FriendsScreen = lazy(screens.friends);
const AuthScreen = lazy(screens.auth);
const MockScreen = lazy(screens.mock);
const GameScreen = lazy(screens.game);
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
  const [mockStart, setMockStart] = useState<string | undefined>();
  const [gameOpen, setGameOpen] = useState(() => window.location.hash === '#/game');
  const acc = useAccount();
  const [session, setSession] = useState<SessionMode | null>(null);
  useEffect(() => {
    // the admin area manages the Chinese course content only
    if (adminOpen && acc.role === 'admin' && getCourse() !== 'zh') setCourse('zh');
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
  const voiceHint = <>Thiết bị chưa có giọng đọc {langName()}: hãy cài giọng “{VOICE_PACK[COURSE_LANG[getCourse()]]}” trong cài đặt hệ thống, hoặc dùng Chrome/Safari/Edge.</>;
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
      setGameOpen(window.location.hash === '#/game');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const changeTab = (t: Tab) => {
    window.location.hash = `/${t}`;
    setTab(t);
    setMockOpen(false);
    setGameOpen(false);
    window.scrollTo(0, 0);
  };

  // v5.2.8: lessons and part tests from Part 3 on need an account (the game and the review stay open).
  const [gate, setGate] = useState(false);
  // v5.4.0: VIP content is a second layer on top of the login gate (see lib/vip.ts).
  const vip = useVip();
  const [vipGate, setVipGate] = useState(false);
  useVipParts();
  const vipBlocked = (unit: number) => {
    if (!firebaseConfigured || vip || !partVip(getCourse(), unit)) return false;
    setVipGate(true);
    return true;
  };
  const gated = (unit: number | undefined) => {
    // VIP content says so first (its gate also offers the login); everything else from Part 3 on asks for a login.
    if (unit !== undefined && vipBlocked(unit)) return true;
    if (!firebaseConfigured || acc.user || !needsLogin(unit)) return false;
    setGate(true);
    return true;
  };
  // A course whose parts are all VIP is closed as a whole: its games, reviews and mock tests too.
  const courseBlocked = firebaseConfigured && !vip && vipCourse(getCourse());

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
  if ((mockOpen || gameOpen) && !session && courseBlocked)
    return (
      <div className="min-h-[100dvh] bg-surface">
        <VipGate
          onClose={() => changeTab('learn')}
          onLogin={() => {
            changeTab('learn');
            openAuth();
          }}
        />
      </div>
    );
  if (mockOpen && !session)
    return (
      <>
        {toast}
        <Suspense fallback={<Loading />}>
          <MockScreen onClose={() => changeTab('learn')} start={mockStart} />
        </Suspense>
      </>
    );

  // 'Trò chơi': a casual mini-game (no hearts), guests included.
  if (gameOpen && !session && (courseChosen() || p.settings.level))
    return (
      <>
        {toast}
        <Suspense fallback={<Loading />}>
          <GameScreen onClose={() => changeTab('learn')} />
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
          onStart={(id) => {
            if (!gated(LESSON_BY_ID[id]?.unit)) setSession({ type: 'lesson', lessonId: id });
          }}
          onTest={(unit) => {
            if (!gated(unit)) setSession({ type: 'test', unit });
          }}
          onMock={(target) => {
            setMockStart(target);
            window.location.hash = '/mock';
            setMockOpen(true);
            window.scrollTo(0, 0);
          }}
          onGame={() => {
            window.location.hash = '/game';
            setGameOpen(true);
            window.scrollTo(0, 0);
          }}
        />
      )}
      <Suspense fallback={<Loading />}>
      {tab === 'review' && (
        <DataGate units={unitsOfWords(Object.keys(p.words))}>
          <ReviewScreen
            onStart={() => {
              if (courseBlocked) setVipGate(true);
              else setSession({ type: 'review' });
            }}
          />
        </DataGate>
      )}
      {tab === 'words' &&
        (courseBlocked ? (
          <div className="mx-auto max-w-md px-4 pt-10 text-center" data-testid="words-vip">
            <p className="text-lg font-black text-ink-700">Khoá học này dành cho tài khoản VIP</p>
            <p className="mt-1 text-sm font-bold text-ink-500">Từ vựng {langName()} chỉ mở cho tài khoản VIP.</p>
            <button type="button" className="btn-green mt-4" onClick={() => setVipGate(true)} data-testid="words-vip-more">
              Cách kích hoạt VIP
            </button>
          </div>
        ) : (
          <WordsScreen />
        ))}
      {(tab === 'rank' || (tab === 'friends' && !chatOpen)) && <SocialTabs tab={tab} onChange={changeTab} friendsBadge={acc.user ? socialBadge(social) : 0} />}
      {tab === 'friends' && <FriendsScreen onLogin={openAuth} onChat={setChatOpen} />}
      {tab === 'rank' && <LeaderboardScreen onLogin={openAuth} />}
      {tab === 'profile' && <ProfileScreen onLogin={openAuth} onAdmin={openAdmin} />}
      </Suspense>
      {gate && !acc.user && (
        <LoginGate
          onClose={() => setGate(false)}
          onEmail={() => {
            setGate(false);
            openAuth();
          }}
        />
      )}
      {vipGate && !vip && (
        <VipGate
          onClose={() => setVipGate(false)}
          onLogin={() => {
            setVipGate(false);
            openAuth();
          }}
        />
      )}
      {acc.sessionLost && !acc.user && !gate && !vipGate && <SessionNotice onLogin={openAuth} />}
      {!gate && !vipGate && !acc.sessionLost && !(tab === 'friends' && chatOpen) && <AnnouncementPanel />}
      {!(tab === 'friends' && chatOpen) && <Footer className="pb-24" />}
      {!(tab === 'friends' && chatOpen) && <ScrollButtons />}
      {!(tab === 'friends' && chatOpen) && <BottomNav tab={tab} onChange={changeTab} badge={Math.min(dueCount(p), 10)} friendsBadge={acc.user ? socialBadge(social) : 0} />}
    </div>
  );
}
