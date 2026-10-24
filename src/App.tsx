import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Flame,
  Headphones,
  Leaf,
  Map,
  Play,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sprout,
  Target,
  Trophy,
  Volume2,
  X,
  Library,
  Gift,
} from "lucide-react";
import IslandMap from "./components/IslandMap";
import Practice, { type ActiveSession } from "./components/Practice";
import Modal from "./components/Modal";
import Journey, { LessonDialogBody, type World } from "./components/Journey";
import StudyLibrary, { studyNeighbors } from "./components/StudyLibrary";
import Collection from "./components/Collection";
import {
  entryById,
  lessonById,
  type Lesson,
  type LessonId,
  type StudyEntry,
} from "./data/catalog";
import {
  buyDecoration,
  completeSession,
  placeDecoration,
  toggleFavorite,
} from "./lib/game";
import {
  chapters,
  kana,
  type Chapter,
  type Kana,
  type KanaKind,
  type Script,
} from "./data/curriculum";
import {
  applyAttempt,
  buildSession,
  chapterStats,
  emptyProgress,
  localDay,
  longestStreakDays,
  makeKanaQuestion,
  makeEntryQuestion,
  memoryKey,
  streakDays,
  validateProgress,
  type Attempt,
  type Progress,
  type SessionSummary,
} from "./lib/learning";
import {
  exportProgress,
  exportUpgradeBackup,
  loadProgress,
  removeUpgradeBackup,
  saveProgress,
} from "./lib/storage";
import { getJapaneseVoices, playJapanese, stopAudio } from "./lib/audio";
import { isNative } from "./lib/platform";

type Page =
  "home" | "chart" | "library" | "collection" | "journal" | "settings";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const navItems: { id: Page; label: string; icon: typeof Map }[] = [
  { id: "home", label: "学习地图", icon: Map },
  { id: "chart", label: "五十音图", icon: BookOpen },
  { id: "library", label: "课程词库", icon: Library },
  { id: "collection", label: "收藏小屋", icon: Gift },
  { id: "journal", label: "记忆手帐", icon: Sprout },
  { id: "settings", label: "小岛设置", icon: SettingsIcon },
];

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [toast, setToast] = useState("");
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [world, setWorld] = useState<World>("kana");
  const [libraryLesson, setLibraryLesson] = useState<LessonId | undefined>();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [installPrompt, setInstallPrompt] = useState<InstallEvent | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    let alive = true;
    void loadProgress()
      .then((data) => {
        if (alive) setProgress(data);
      })
      .catch(() => {
        if (alive) {
          setStorageError(true);
          setToast(
            "本地记录暂时无法读取。当前仍可练习，请用导出备份保存进度。",
          );
        }
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded || storageError) return;
    void saveProgress(progress).catch(() => {
      setStorageError(true);
      setToast("浏览器未能保存进度，请在小岛设置中导出备份。");
    });
  }, [progress, loaded, storageError]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    const updateVoices = () => setVoices(getJapaneseVoices());
    updateVoices();
    window.addEventListener("kana-voices-changed", updateVoices);
    if ("speechSynthesis" in window)
      speechSynthesis.addEventListener("voiceschanged", updateVoices);
    const install = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallEvent);
    };
    const installed = () => {
      setInstallPrompt(null);
      setToast("小岛已加入设备，随时可以回来练习。");
    };
    const offline = () => setOfflineReady(true);
    const update = () => setUpdateReady(true);
    const audioError = (event: Event) =>
      setToast((event as CustomEvent<string>).detail);
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("kana-offline-ready", offline);
    window.addEventListener("kana-update-ready", update);
    window.addEventListener("kana-audio-error", audioError);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.active) setOfflineReady(true);
      });
    return () => {
      clearInterval(timer);
      stopAudio();
      if ("speechSynthesis" in window)
        speechSynthesis.removeEventListener("voiceschanged", updateVoices);
      window.removeEventListener("kana-voices-changed", updateVoices);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("kana-offline-ready", offline);
      window.removeEventListener("kana-update-ready", update);
      window.removeEventListener("kana-audio-error", audioError);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  const speak = (text: string, id: string) => {
    if (!playJapanese(text, id, progress.settings.voiceURI))
      notify(
        "没有可用的日语声音。可在系统中添加日语语音包，或先练习看字回忆。",
      );
  };
  const start = (
    chapter: ActiveSession["chapter"],
    direction: "read" | "listen" | "meaning" = "read",
  ) => {
    if (!loaded) return;
    if (direction === "listen" && !voices.length) {
      notify("设备暂未提供日语声音，请先选择看字回忆。");
      return;
    }
    const questions = buildSession(chapter, progress, direction);
    if (!questions.length) {
      notify("暂时没有到期的内容。可以先去小岛探索一个关卡。");
      return;
    }
    if (questions.some((q) => q.direction === "listen") && !voices.length) {
      notify(
        "部分复习题需要日语声音，请在设置中添加声音后再来。其他关卡仍可练习。",
      );
      return;
    }
    stopAudio();
    setSelectedChapter(null);
    setSelectedLesson(null);
    setSession({ id: crypto.randomUUID(), chapter, questions });
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const onAttempt = (attempt: Attempt) =>
    setProgress((previous) => applyAttempt(previous, attempt));
  const finish = (attempts: Attempt[]) => {
    if (!session) return;
    const summary: SessionSummary = {
      id: session.id,
      chapter: session.chapter,
      at: Date.now(),
      completed: true,
      count: attempts.length,
      correct: attempts.filter((a) => a.correct).length,
    };
    setProgress((p) => completeSession(p, summary).progress);
  };
  const exit = () => {
    if (session) {
      const attempts = progress.attempts.filter(
        (a) => a.sessionId === session.id,
      );
      if (
        attempts.length &&
        !progress.sessions.some((s) => s.id === session.id)
      ) {
        const summary: SessionSummary = {
          id: session.id,
          chapter: session.chapter,
          at: Date.now(),
          completed: false,
          count: attempts.length,
          correct: attempts.filter((a) => a.correct).length,
        };
        setProgress((p) => ({
          ...p,
          sessions: [...p.sessions, summary].slice(-10_000),
        }));
      }
    }
    stopAudio();
    setSession(null);
    setNow(Date.now());
  };
  const dueCount = Object.values(progress.memories).filter(
    (m) => m.due <= now,
  ).length;
  const today = progress.attempts.filter(
    (a) => localDay(a.at) === localDay(now),
  );
  const streak = streakDays(progress.attempts, now);
  const mastered = Object.values(progress.memories).filter(
    (m) => m.stage >= 3 && m.direction === "read",
  ).length;
  const visitPage = (next: Page) => {
    if (!session) {
      setPage(next);
      if (next === "library") setLibraryLesson(undefined);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };
  const browseLesson = (id: LessonId) => {
    setLibraryLesson(id);
    setSelectedLesson(null);
    setPage("library");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const practiceEntry = (entry: StudyEntry, direction: "read" | "meaning") => {
    const questions = studyNeighbors(entry).map((item) =>
      makeEntryQuestion(item, direction),
    );
    setSession({ id: crypto.randomUUID(), chapter: entry.lessonId, questions });
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            visitPage("home");
          }}
        >
          <span className="brand-icon">
            <Leaf size={24} />
          </span>
          <span>
            <b lang="ja">ことばの島</b>
            <small>KOTOBA NO SHIMA</small>
          </span>
        </a>
        <div className="sidebar-label">我的学习空间</div>
        <nav aria-label="主要导航">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              aria-current={page === item.id ? "page" : undefined}
              disabled={!!session}
              onClick={() => visitPage(item.id)}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === "journal" && dueCount > 0 && (
                <small className="nav-count">{dueCount}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-garden">
            <Sprout size={30} />
            <b>一点点，也在生长。</b>
            <p>
              每一次回忆，
              <br />
              都让声音离你近一点。
            </p>
            <span>ゆっくり、いこう。</span>
          </div>
          <div className="local-label">
            <ShieldCheck size={14} />{" "}
            {storageError ? "记得导出你的进度" : "学习记录保存在本机"}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            我的小岛 <ChevronRight size={13} />
            <b>
              {session
                ? "正在冒险"
                : navItems.find((n) => n.id === page)?.label}
            </b>
          </div>
          <div className="topbar-right">
            <span className="streak">
              <Flame size={16} /> 连续学习 <b>{streak}</b> 天
            </span>
            <span className="avatar" aria-label="我的小岛">
              あ
            </span>
          </div>
        </header>
        <main id="main-content">
          {!loaded ? (
            <div className="loading">
              <Leaf size={28} />
              <p>正在打开你的小岛…</p>
            </div>
          ) : session ? (
            <Practice
              key={session.id}
              session={session}
              progress={progress}
              hasVoice={voices.length > 0}
              onAttempt={onAttempt}
              onFinish={finish}
              onExit={exit}
              onRestart={() =>
                start(
                  session.chapter,
                  session.questions[0]?.direction === "listen"
                    ? "listen"
                    : session.questions[0]?.direction === "meaning"
                      ? "meaning"
                      : "read",
                )
              }
              onSpeak={speak}
            />
          ) : page === "home" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="section-kicker">
                    こんにちは，欢迎回到小岛
                  </span>
                  <h1>今天，也和日语靠近一点。</h1>
                  <p>不用一口气记住全部。让每一个声音，慢慢变得熟悉。</p>
                </div>
                <span className="date-label">
                  {new Intl.DateTimeFormat("zh-CN", {
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  }).format(now)}
                </span>
              </div>
              <div className="hero-grid">
                <section className="hero-card">
                  <div className="hero-copy">
                    <span className="hero-tag">
                      <span /> 为你安排的小冒险
                    </span>
                    <h2>
                      把「想一下」
                      <br />
                      变成「脱口而出」。
                    </h2>
                    <p>
                      浊音直接回忆 × 片假名入门
                      <br />
                      从你还不熟悉的地方，轻轻往前走。
                    </p>
                    <button
                      className="primary-button"
                      onClick={() => start("daily")}
                    >
                      <Play size={16} fill="currentColor" /> 开始今日冒险{" "}
                      <ArrowRight size={17} />
                    </button>
                    <span className="hero-meta">
                      12 道小练习 <i /> 约 3–5 分钟 <i /> 随时可以休息
                    </span>
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="hero-orbit orbit-one" />
                    <div className="hero-orbit orbit-two" />
                    <span className="hero-spark spark-one">✧</span>
                    <span className="hero-spark spark-two">✧</span>
                    <div className="floating-kana kana-hira">
                      <small>ひらがな</small>
                      <b>が</b>
                      <span>ga</span>
                      <i>
                        <Volume2 size={14} />
                      </i>
                    </div>
                    <div className="floating-kana kana-kata">
                      <small>カタカナ</small>
                      <b>カ</b>
                      <span>ka</span>
                      <i>
                        <Check size={15} />
                      </i>
                    </div>
                    <span className="art-leaf">
                      <Leaf size={28} />
                    </span>
                    <span className="art-note">はじめの一歩。</span>
                  </div>
                </section>
                <section className="daily-card panel">
                  <div className="card-heading">
                    <h2>我的今日足迹</h2>
                    <span className="soft-icon">
                      <Sprout size={20} />
                    </span>
                  </div>
                  <div className="daily-number">
                    {today.length}
                    <span> / 12 题</span>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${Math.min(100, (today.length / 12) * 100)}%`,
                      }}
                    />
                  </div>
                  <p>
                    {today.length >= 12
                      ? "今日目标达成，小岛又多了一点生机。"
                      : today.length
                        ? "已经出发了，再走一小步也很好。"
                        : "一场小小的冒险，从第一题开始。"}
                  </p>
                  <div className="daily-split">
                    <div>
                      <span>本机累计熟练</span>
                      <b>
                        {mastered}
                        <small> 个认读项</small>
                      </b>
                    </div>
                    <div>
                      <span>等待复习</span>
                      <b>
                        {dueCount}
                        <small> 项</small>
                      </b>
                    </div>
                  </div>
                  <button
                    className="review-link"
                    onClick={() => start("review")}
                    disabled={!dueCount}
                  >
                    到期复习 {dueCount > 0 && <span>{dueCount}</span>}
                    <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <Journey
                world={world}
                onWorld={setWorld}
                progress={progress}
                onSelect={setSelectedLesson}
              />
              {world === "kana" && (
                <>
                  <section className="map-section">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">LEARNING JOURNEY</span>
                        <h2>一座小岛，一段新旅程。</h2>
                      </div>
                      <span className="section-aside">
                        <Compass size={15} /> 六个区域，自由探索
                      </span>
                    </div>
                    <IslandMap
                      onSelect={(id) =>
                        setSelectedChapter(chapters.find((c) => c.id === id)!)
                      }
                      completed={chapters
                        .filter(
                          (c) =>
                            chapterStats(c.id, progress).seen ===
                            chapterStats(c.id, progress).total,
                        )
                        .map((c) => c.id)}
                    />
                  </section>
                  <div className="chapter-grid">
                    {chapters.map((chapter, index) => (
                      <ChapterCard
                        key={chapter.id}
                        chapter={chapter}
                        index={index}
                        progress={progress}
                        onClick={() => setSelectedChapter(chapter)}
                      />
                    ))}
                  </div>
                </>
              )}
              <div className="gentle-tip">
                <span>
                  <Leaf size={17} />
                </span>
                <p>
                  <b>小岛来信</b>
                  　不必每次都答得很快。先回忆，再看提示；今天想过的，明天可能就自然认出来了。
                </p>
                <span className="japanese-note">一歩ずつ。</span>
              </div>
            </>
          ) : page === "chart" ? (
            <KanaChart
              progress={progress}
              onSpeak={speak}
              onPractice={(item) => {
                const chapter =
                  item.kind === "yoon"
                    ? "yoon"
                    : item.script === "katakana"
                      ? "katakana"
                      : item.kind === "voiced"
                        ? "voiced"
                        : "hiragana";
                const questions = [
                  item,
                  ...kana
                    .filter(
                      (k) =>
                        k.script === item.script &&
                        k.kind === item.kind &&
                        k.id !== item.id,
                    )
                    .slice(0, 4),
                  item,
                ].map((k) => makeKanaQuestion(k, "read"));
                setSession({ id: crypto.randomUUID(), chapter, questions });
              }}
            />
          ) : page === "library" ? (
            <StudyLibrary
              key={libraryLesson || "all"}
              progress={progress}
              initialLessonId={libraryLesson}
              onFavorite={(id) => setProgress((p) => toggleFavorite(p, id))}
              onPractice={practiceEntry}
              onSpeak={speak}
            />
          ) : page === "collection" ? (
            <Collection
              progress={progress}
              onLibrary={() => visitPage("library")}
              onBuy={(id) => {
                try {
                  setProgress(buyDecoration(progress, id));
                  notify("装饰已收入收藏，选择位置就能摆放。");
                } catch (error) {
                  notify((error as Error).message);
                }
              }}
              onPlace={(slot, id) => {
                try {
                  setProgress(placeDecoration(progress, slot, id));
                } catch (error) {
                  notify((error as Error).message);
                }
              }}
            />
          ) : page === "journal" ? (
            <Journal
              progress={progress}
              now={now}
              onReview={() => start("review")}
              dueCount={dueCount}
              onExplore={() => visitPage("home")}
            />
          ) : (
            <SettingsPage
              progress={progress}
              setProgress={setProgress}
              voices={voices}
              onSpeak={speak}
              notify={notify}
              installPrompt={installPrompt}
              offlineReady={offlineReady}
              updateReady={updateReady}
              storageError={storageError}
              onInstall={async () => {
                if (!installPrompt) return;
                await installPrompt.prompt();
                await installPrompt.userChoice;
                setInstallPrompt(null);
              }}
            />
          )}
          <footer className="page-footer">
            <span>
              <Leaf size={12} /> ことばの島 · KOTOBA NO SHIMA
            </span>
            <span>每天一点点，声音会记得。</span>
          </footer>
        </main>
      </div>
      {selectedLesson && (
        <Modal
          title={selectedLesson.title}
          onClose={() => setSelectedLesson(null)}
        >
          <LessonDialogBody
            lesson={selectedLesson}
            progress={progress}
            onStart={start}
            onBrowse={browseLesson}
            onPrerequisite={(id) => setSelectedLesson(lessonById.get(id)!)}
          />
        </Modal>
      )}
      {selectedChapter && (
        <Modal
          title={selectedChapter.name}
          onClose={() => setSelectedChapter(null)}
        >
          <div
            className={`chapter-dialog-symbol ${selectedChapter.color}`}
            lang="ja"
          >
            {selectedChapter.glyph}
          </div>
          <span className="section-kicker">{selectedChapter.subtitle}</span>
          <h2>{selectedChapter.name}</h2>
          <p>{selectedChapter.description}</p>
          <div className="chapter-dialog-info">
            <b>
              {selectedChapter.id === "rhythm" || selectedChapter.id === "pitch"
                ? "理解声音里的规则"
                : "先认识，再独立回忆"}
            </b>
            <p>
              {selectedChapter.id === "rhythm"
                ? "用完整词语和拍格区分长音、促音、拗音与拨音。答题后展开解释与对比。"
                : selectedChapter.id === "pitch"
                  ? "以东京日语为例，区分词的高低重音与句子语调。高低示意音为纯音，不是真人发音。"
                  : "每轮引入少量新字，练习输入读音。遇到卡点可查看提示，系统会安排再次复习。"}
            </p>
          </div>
          <div className="button-column">
            <button
              className="primary-button"
              onClick={() => start(selectedChapter.id)}
            >
              开始
              {selectedChapter.id === "rhythm" || selectedChapter.id === "pitch"
                ? "小课堂"
                : "看字回忆"}{" "}
              <ArrowRight size={17} />
            </button>
            {!["rhythm", "pitch"].includes(selectedChapter.id) && (
              <button
                className="secondary-button"
                disabled={!voices.length}
                onClick={() => start(selectedChapter.id, "listen")}
              >
                <Headphones size={17} />{" "}
                {voices.length
                  ? "听音辨认 · 设备合成语音"
                  : "听音辨认 · 需要设备日语声音"}
              </button>
            )}
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Leaf size={18} />
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="关闭通知"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function ChapterCard({
  chapter,
  index,
  progress,
  onClick,
}: {
  chapter: Chapter;
  index: number;
  progress: Progress;
  onClick: () => void;
}) {
  const stats = chapterStats(chapter.id, progress);
  return (
    <button
      className={`chapter-card ${chapter.color} ${chapter.id === "voiced" ? "recommended" : ""}`}
      onClick={onClick}
    >
      <div className="chapter-card-top">
        <span className="chapter-number">0{index + 1}</span>
        <span className="chapter-badge">{chapter.badge}</span>
      </div>
      <div className="chapter-card-main">
        <span className="chapter-glyph" lang="ja">
          {chapter.glyph}
        </span>
        <div>
          <h3>{chapter.name}</h3>
          <span>{chapter.subtitle}</span>
        </div>
        <ArrowRight size={19} />
      </div>
      <p>{chapter.description}</p>
      <div className="chapter-card-bottom">
        <div className="progress-track">
          <span style={{ width: `${(stats.seen / stats.total) * 100}%` }} />
        </div>
        <small>
          已探索 {stats.seen} / {stats.total}
        </small>
      </div>
    </button>
  );
}

function KanaChart({
  progress,
  onSpeak,
  onPractice,
}: {
  progress: Progress;
  onSpeak: (text: string, id: string) => void;
  onPractice: (item: Kana) => void;
}) {
  const [script, setScript] = useState<Script>("hiragana");
  const [kind, setKind] = useState<KanaKind>("basic");
  const [search, setSearch] = useState("");
  const [showReading, setShowReading] = useState(true);
  const [selected, setSelected] = useState<Kana | null>(null);
  const items = kana.filter(
    (k) =>
      k.script === script &&
      k.kind === kind &&
      (!search ||
        `${k.glyph} ${k.reading} ${k.aliases.join(" ")}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  const rows = [...new Set(items.map((k) => k.row))];
  const status = (item: Kana) => {
    const memory = progress.memories[memoryKey(item.id, "read")];
    return !memory ? "unseen" : memory.stage >= 3 ? "mastered" : "learning";
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-kicker">KANA COLLECTION</span>
          <h1>每个声音，都有自己的模样。</h1>
          <p>点击假名查看读音与提示。把熟悉的声音，连接到新的字形。</p>
        </div>
        <BookOpen className="heading-icon" size={36} />
      </div>
      <div className="chart-toolbar panel">
        <div className="segmented">
          <button
            className={script === "hiragana" ? "active" : ""}
            onClick={() => setScript("hiragana")}
          >
            平假名 <span lang="ja">あ</span>
          </button>
          <button
            className={script === "katakana" ? "active" : ""}
            onClick={() => setScript("katakana")}
          >
            片假名 <span lang="ja">ア</span>
          </button>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="查找假名或读音"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="查找假名或读音…"
          />
        </label>
      </div>
      <div className="chart-subnav">
        <div className="tabs">
          {(["basic", "voiced", "yoon"] as const).map((value) => (
            <button
              className={kind === value ? "active" : ""}
              key={value}
              onClick={() => setKind(value)}
            >
              {value === "basic"
                ? "清音 · 拨音"
                : value === "voiced"
                  ? "浊音 · 半浊音"
                  : "拗音"}
            </button>
          ))}
        </div>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={showReading}
            onChange={(e) => setShowReading(e.target.checked)}
          />{" "}
          显示罗马字
        </label>
      </div>
      <div className="kana-chart panel">
        <div className="chart-legend">
          <span>
            <i className="unseen" /> 未探索
          </span>
          <span>
            <i className="learning" /> 正在熟悉
          </span>
          <span>
            <i className="mastered" /> 已熟练
          </span>
          <small>{items.length} 个假名</small>
        </div>
        {!items.length ? (
          <div className="empty-state">
            <Search size={30} />
            <h3>还没有找到这个假名</h3>
            <p>试试切换平假名 / 片假名，或换一个读音。</p>
          </div>
        ) : (
          <div className={`kana-rows ${kind === "yoon" ? "yoon-rows" : ""}`}>
            <div className="kana-row column-header">
              <span />
              {(kind === "yoon"
                ? ["ya", "yu", "yo"]
                : ["a", "i", "u", "e", "o"]
              ).map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            {rows.map((row) => {
              const values = items.filter((k) => k.row === row);
              const isY = kind === "basic" && /[やヤ]/.test(row);
              const isW = kind === "basic" && /[わワ]/.test(row);
              const cells: (Kana | undefined)[] = search
                ? values
                : isY
                  ? [values[0], undefined, values[1], undefined, values[2]]
                  : isW
                    ? [values[0], undefined, undefined, undefined, values[1]]
                    : values;
              return (
                <div key={row}>
                  <div className="kana-row">
                    <span className="row-label">
                      {isW ? (script === "hiragana" ? "わ行" : "ワ行") : row}
                    </span>
                    {cells.map((item, i) =>
                      item ? (
                        <button
                          className={`kana-cell ${status(item)}`}
                          key={item.id}
                          aria-label={`${item.glyph} ${showReading ? item.reading : ""}`}
                          onClick={() => setSelected(item)}
                        >
                          <span lang="ja">{item.glyph}</span>
                          {showReading && <small>{item.reading}</small>}
                          <i />
                        </button>
                      ) : (
                        <div className="kana-cell blank" key={i} />
                      ),
                    )}
                  </div>
                  {isW && !search && values[2] && (
                    <div className="kana-row">
                      <span className="row-label">拨音</span>
                      <button
                        className={`kana-cell ${status(values[2])}`}
                        aria-label={values[2].glyph}
                        onClick={() => setSelected(values[2])}
                      >
                        <span lang="ja">{values[2].glyph}</span>
                        {showReading && <small>{values[2].reading}</small>}
                        <i />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="below-note">
        <CircleHint />{" "}
        清音表包含现代常用假名与拨音；扩展外来语组合（如ファ、ティ）留待后续。熟练状态来自间隔复习，不因查看图表而改变。
      </p>
      {selected && (
        <Modal
          title={`假名 ${selected.glyph}`}
          onClose={() => setSelected(null)}
        >
          <div className="kana-detail-glyph" lang="ja">
            {selected.glyph}
          </div>
          <div className="kana-detail-reading">
            {selected.reading}
            <button
              className="icon-button"
              aria-label="朗读这个假名"
              onClick={() => onSpeak(selected.glyph, selected.id)}
            >
              <Volume2 size={20} />
            </button>
          </div>
          <p>{selected.hint}</p>
          <div className="chapter-dialog-info">
            <b>两种练习，分别记忆</b>
            <p>
              看字回忆：
              {progress.memories[memoryKey(selected.id, "read")]?.attempts ||
                0}{" "}
              次　听音辨认：
              {progress.memories[memoryKey(selected.id, "listen")]?.attempts ||
                0}{" "}
              次
            </p>
          </div>
          <button
            className="primary-button full-width"
            onClick={() => {
              onPractice(selected);
              setSelected(null);
            }}
          >
            练练这个假名和同组伙伴 <ArrowRight size={17} />
          </button>
        </Modal>
      )}
    </>
  );
}
function CircleHint() {
  return <span className="circle-hint">i</span>;
}

function Journal({
  progress,
  now,
  onReview,
  dueCount,
  onExplore,
}: {
  progress: Progress;
  now: number;
  onReview: () => void;
  dueCount: number;
  onExplore: () => void;
}) {
  const attempts = progress.attempts;
  const accuracy = attempts.length
    ? Math.round(
        (attempts.filter((a) => a.correct).length / attempts.length) * 100,
      )
    : 0;
  const fluent = Object.values(progress.memories).filter(
    (m) => m.stage >= 3,
  ).length;
  const days = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 27 + index);
    const day = localDay(date.getTime());
    return {
      day,
      count: attempts.filter((a) => localDay(a.at) === day).length,
    };
  });
  const hard = Object.values(progress.memories)
    .filter((m) => m.correct < m.attempts)
    .sort((a, b) => b.attempts - b.correct - (a.attempts - a.correct))
    .slice(0, 8);
  const completed = progress.sessions.filter((s) => s.completed).length;
  const badges = [
    {
      name: "第一步",
      description: "完成第一道练习",
      unlocked: attempts.length > 0,
      glyph: "芽",
    },
    {
      name: "小岛旅人",
      description: "完成 5 轮冒险",
      unlocked: completed >= 5,
      glyph: "旅",
    },
    {
      name: "日常的力量",
      description: "曾连续学习 3 天",
      unlocked: longestStreakDays(attempts) >= 3,
      glyph: "日",
    },
    {
      name: "渐渐熟悉",
      description: "10 个练习项达到熟练",
      unlocked: fluent >= 10,
      glyph: "音",
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-kicker">MY MEMORY JOURNAL</span>
          <h1>看见自己，一点点进步。</h1>
          <p>正确率之外，也记下你愿意再试一次的每一天。</p>
        </div>
        <button
          className="primary-button"
          disabled={!dueCount}
          onClick={onReview}
        >
          复习到期内容 {dueCount > 0 && `· ${dueCount}`}
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="journal-stats">
        {[
          {
            label: "累计完成",
            value: attempts.length,
            unit: "题",
            icon: Target,
          },
          { label: "累计正确率", value: accuracy, unit: "%", icon: Check },
          {
            label: "连续学习",
            value: streakDays(attempts, now),
            unit: "天",
            icon: Flame,
          },
          { label: "间隔复习后熟练", value: fluent, unit: "项", icon: Sprout },
        ].map((s) => (
          <div className="panel stat-card" key={s.label}>
            <s.icon size={21} />
            <span>{s.label}</span>
            <b>
              {s.value}
              <small>{s.unit}</small>
            </b>
          </div>
        ))}
      </div>
      <div className="journal-grid">
        <section className="panel journal-panel">
          <div className="card-heading">
            <h2>最近四周的小足迹</h2>
            <span className="section-kicker">
              {days.filter((d) => d.count).length} 个学习日
            </span>
          </div>
          <div className="activity-grid">
            {days.map((day) => (
              <div
                key={day.day}
                title={`${day.day} · ${day.count} 题`}
                className={
                  day.count >= 24
                    ? "level-3"
                    : day.count >= 12
                      ? "level-2"
                      : day.count > 0
                        ? "level-1"
                        : ""
                }
              >
                <span>{Number(day.day.slice(-2))}</span>
                <small>{day.count ? `${day.count}题` : "·"}</small>
              </div>
            ))}
          </div>
          <p className="muted-note">
            以当前设备的本地日期记录。今天练得少，也算向前走。
          </p>
        </section>
        <section className="panel journal-panel">
          <div className="card-heading">
            <h2>我的小岛纪念章</h2>
            <Trophy size={20} />
          </div>
          <div className="badge-grid">
            {badges.map((badge) => (
              <div
                className={`achievement ${badge.unlocked ? "unlocked" : ""}`}
                key={badge.name}
              >
                <span lang="ja">{badge.glyph}</span>
                <b>{badge.name}</b>
                <small>{badge.description}</small>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel journal-panel">
        <div className="card-heading">
          <h2>再见面，会更熟悉</h2>
          <span className="muted-note">近期值得留意的卡点</span>
        </div>
        {hard.length ? (
          <div className="confusion-list">
            {hard.map((m) => (
              <div key={m.key}>
                <b lang="ja">
                  {kana.find((k) => k.id === m.itemId)?.glyph ||
                    entryById.get(m.itemId)?.character ||
                    entryById.get(m.itemId)?.term ||
                    "发音规则"}
                </b>
                <span>
                  {m.direction === "read"
                    ? "看字回忆"
                    : m.direction === "listen"
                      ? "听音辨认"
                      : m.direction === "meaning"
                        ? "词义理解"
                        : "知识理解"}
                  <small>
                    答对 {m.correct} / {m.attempts} 次
                  </small>
                </span>
                <small>{m.due <= now ? "可以复习了" : "稍后再见"}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Sprout size={32} />
            <h3>
              {attempts.length
                ? "暂时没有答错的内容"
                : "你的记忆花园，还在等第一颗种子"}
            </h3>
            <p>
              {attempts.length
                ? "下一次间隔复习，会帮你检验记忆是否留下来了。"
                : "完成一轮练习，这里就会出现你的学习足迹。"}
            </p>
            {!attempts.length && (
              <button className="secondary-button" onClick={onExplore}>
                去探索小岛 <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </section>
      <p className="below-note">
        <CircleHint />{" "}
        熟练需要跨时间的独立正确回忆。提示后答对、明显迟疑和答错都会安排短间隔复习；反应时间包含输入耗时，仅作辅助。
      </p>
    </>
  );
}

function SettingsPage({
  progress,
  setProgress,
  voices,
  onSpeak,
  notify,
  installPrompt,
  onInstall,
  offlineReady,
  updateReady,
  storageError,
}: {
  progress: Progress;
  setProgress: React.Dispatch<React.SetStateAction<Progress>>;
  voices: SpeechSynthesisVoice[];
  onSpeak: (text: string, id: string) => void;
  notify: (message: string) => void;
  installPrompt: InstallEvent | null;
  onInstall: () => Promise<void>;
  offlineReady: boolean;
  updateReady: boolean;
  storageError: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Progress | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetText, setResetText] = useState("");
  const backup = () =>
    void exportProgress(progress).catch(() =>
      notify("备份未能保存，请检查保存位置或分享选项后再试。"),
    );
  const changeSetting = <K extends keyof Progress["settings"]>(
    key: K,
    value: Progress["settings"][K],
  ) =>
    setProgress((p) => ({ ...p, settings: { ...p.settings, [key]: value } }));
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 32 * 1024 * 1024)
        throw new Error("文件过大，请选择小于 32 MB 的进度备份。");
      const next = validateProgress(JSON.parse(await file.text()));
      setPendingImport(next);
    } catch (error) {
      notify(
        error instanceof SyntaxError
          ? "文件不是有效的 JSON，当前进度未改动。"
          : error instanceof Error
            ? error.message
            : "无法读取这个文件。",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-kicker">MAKE YOURSELF AT HOME</span>
          <h1>按自己的节奏，安顿下来。</h1>
          <p>调整练习方式，备份学习记录，让小岛随时陪在身边。</p>
        </div>
      </div>
      <div className="settings-layout">
        <section className="panel settings-panel">
          <h2>
            <SettingsIcon size={20} /> 练习偏好
          </h2>
          <div className="setting-row">
            <div>
              <b>默认答题方式</b>
              <p>输入练主动回忆，选项适合刚认识的新字。</p>
            </div>
            <select
              aria-label="默认答题方式"
              value={progress.settings.inputMode}
              onChange={(e) =>
                changeSetting(
                  "inputMode",
                  e.target.value as "typing" | "choice",
                )
              }
            >
              <option value="typing">输入罗马字</option>
              <option value="choice">选择答案</option>
            </select>
          </div>
          <div className="setting-row">
            <div>
              <b>日语参考声音</b>
              <p>
                {voices.length
                  ? `已发现 ${voices.length} 个设备日语声音。`
                  : "设备暂未提供日语声音；文字练习不受影响。"}
              </p>
            </div>
            <select
              aria-label="日语参考声音"
              disabled={!voices.length}
              value={progress.settings.voiceURI}
              onChange={(e) => changeSetting("voiceURI", e.target.value)}
            >
              <option value="">
                {voices.length ? "使用首个日语声音" : "没有日语声音"}
              </option>
              {voices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                  {voice.localService ? " · 本地" : " · 在线"}
                </option>
              ))}
            </select>
          </div>
          <button
            className="secondary-button"
            onClick={() => onSpeak("あいうえお", "voice-test")}
          >
            <Volume2 size={17} /> 试听设备声音
          </button>
          <div className="info-callout">
            <b>关于音频的说明</b>
            <p>
              当前版本使用设备合成语音，辅助假名辨认；尚未内置经过逐条核对的真人录音，不能用它判定声调是否标准。部分声音需要联网。
            </p>
            <p>
              没有声音时，可在系统语言设置中添加日语语音包，或换用提供日语声音的浏览器。高低音关卡使用明确标注的示意纯音。
            </p>
          </div>
        </section>
        <section className="panel settings-panel">
          <h2>
            <ShieldCheck size={20} /> 学习记录与备份
          </h2>
          <p>
            记录保存在当前浏览器中。换设备、换浏览器或清除网站数据前，请先导出备份；进度不会自动同步。
          </p>
          {storageError && (
            <div className="info-callout warning">
              <b>本地保存当前不可用</b>
              <p>
                请先导出当前进度，再检查浏览器的存储权限。重新打开后再确认是否恢复。
              </p>
            </div>
          )}
          <div className="backup-summary">
            <span>
              <b>{progress.attempts.length}</b> 条答题记录
            </span>
            <span>
              <b>{progress.sessions.filter((s) => s.completed).length}</b>{" "}
              轮完整冒险
            </span>
          </div>
          <div className="button-row">
            <button className="secondary-button" onClick={backup}>
              <ArrowDownToLine size={17} /> 导出备份
            </button>
            <button
              className="secondary-button"
              onClick={() => fileRef.current?.click()}
            >
              <ArrowUpFromLine size={17} /> 导入备份
            </button>
            <input
              className="visually-hidden"
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              aria-label="选择进度备份"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </div>
          <div className="setting-divider" />
          <button
            className="text-button"
            onClick={async () => {
              try {
                if (!(await exportUpgradeBackup()))
                  notify(
                    "当前浏览器没有升级前的旧版快照；可直接使用正常导出备份。",
                  );
              } catch {
                notify("无法读取升级快照，请先导出当前进度。");
              }
            }}
          >
            <ArrowDownToLine size={15} /> 导出升级前快照
          </button>
          <p className="muted-note">
            旧版记录首次升级时会自动保留一份本机快照。旧版已完成的冒险每轮补发 5
            枚贝壳。
          </p>
          <div className="setting-divider" />
          <button className="danger-link" onClick={() => setResetConfirm(true)}>
            重新开始我的小岛
          </button>
          <p className="muted-note">清空前需要再次确认，建议先导出一份备份。</p>
        </section>
        <section className="panel settings-panel">
          <h2>
            <Leaf size={20} /> 随身携带小岛
          </h2>
          <p>
            {isNative
              ? "页面和题库已随应用安装，可直接离线使用。设备朗读是否需要联网，取决于系统语音包。"
              : offlineReady
                ? "页面与题库已准备好离线使用。设备朗读能否离线，取决于所选语音。"
                : "正式构建首次联网打开后，页面和题库会自动缓存。开发预览中不启用离线缓存。"}
          </p>
          {isNative ? (
            <div className="info-callout">
              <p>
                当前正在使用「ことばの島」安装版。学习记录保存在这台设备中，可通过备份在网页版与安装版之间迁移。
              </p>
            </div>
          ) : installPrompt ? (
            <button className="primary-button" onClick={() => void onInstall()}>
              安装ことばの島 <ArrowRight size={17} />
            </button>
          ) : (
            <div className="info-callout">
              <p>
                支持安装的浏览器会在地址栏或菜单提供「安装应用」或「添加到主屏幕」。请使用同一个地址打开，以继续使用原有进度。
              </p>
            </div>
          )}
          {updateReady && (
            <p className="update-notice">
              发现新版本。请先结束练习并备份，然后关闭所有小岛窗口，再重新打开。
            </p>
          )}
        </section>
        <section className="panel settings-panel references">
          <h2>
            <BookOpen size={20} /> 学习资料
          </h2>
          <p>
            题目为本项目整理的入门练习。课程视频用于课外学习，当前未完成逐节对齐，也未复制视频音轨或
            Tofugu 的联想图片。
          </p>
          <a
            href="https://www.bilibili.com/video/BV18J411774w/"
            target="_blank"
            rel="noreferrer"
          >
            出口仁老师 · 五十音课程 <ArrowRight size={15} />
          </a>
          <a
            href="https://www.tofugu.com/japanese/learn-hiragana/"
            target="_blank"
            rel="noreferrer"
          >
            Tofugu · 平假名教程 <ArrowRight size={15} />
          </a>
          <a
            href="https://www.tofugu.com/japanese/learn-katakana/"
            target="_blank"
            rel="noreferrer"
          >
            Tofugu · 片假名教程 <ArrowRight size={15} />
          </a>
          <a
            href="https://www.coelang.tufs.ac.jp/mt/ja/pmod/practical/02-02-01.php"
            target="_blank"
            rel="noreferrer"
          >
            东京外国语大学 · 拍感与发音 <ArrowRight size={15} />
          </a>
          <a
            href="https://www.gavo.t.u-tokyo.ac.jp/ojad/jpn/pages/home"
            target="_blank"
            rel="noreferrer"
          >
            OJAD · 东京日语高低重音 <ArrowRight size={15} />
          </a>
        </section>
      </div>
      {pendingImport && (
        <Modal title="确认导入备份" onClose={() => setPendingImport(null)}>
          <h2>用这份备份恢复小岛？</h2>
          <p>
            备份包含 {pendingImport.attempts.length} 条答题记录和{" "}
            {pendingImport.sessions.length} 轮关卡记录，另有{" "}
            {pendingImport.favorites.length} 个收藏词条、
            {pendingImport.garden.owned.length} 件装饰。导入会替换当前进度。
          </p>
          <div className="button-column">
            <button className="secondary-button" onClick={backup}>
              先导出当前进度
            </button>
            <button
              className="primary-button"
              onClick={() => {
                setProgress(pendingImport);
                setPendingImport(null);
                notify("备份已导入，小岛进度已恢复。");
              }}
            >
              确认替换并导入
            </button>
          </div>
        </Modal>
      )}
      {resetConfirm && (
        <Modal
          title="确认清空学习记录"
          onClose={() => {
            setResetConfirm(false);
            setResetText("");
          }}
        >
          <h2>重新从第一步出发？</h2>
          <p>
            这会删除当前浏览器中的学习记录、贝壳、装饰、词条收藏、纪念章、升级前快照和偏好设置。导出的备份仍可用于恢复。
          </p>
          <label className="reset-label">
            输入「重新开始」确认
            <input
              value={resetText}
              onChange={(e) => setResetText(e.target.value)}
              placeholder="重新开始"
            />
          </label>
          <div className="button-column">
            <button className="secondary-button" onClick={backup}>
              先导出备份
            </button>
            <button
              className="danger-button"
              disabled={resetText !== "重新开始"}
              onClick={() => {
                void removeUpgradeBackup().catch(() =>
                  notify("升级前快照暂时未能清除，请检查浏览器存储权限。"),
                );
                setProgress(emptyProgress());
                setResetConfirm(false);
                setResetText("");
                notify("小岛已重新开始，欢迎再次出发。");
              }}
            >
              清空并重新开始
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
