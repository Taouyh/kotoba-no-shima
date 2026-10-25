import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Headphones,
  Keyboard,
  ListChecks,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { chapters } from "../data/curriculum";
import { lessonById, kindLabels, type LessonId } from "../data/catalog";
import { isCorrectEntryReading } from "../lib/reading";
import {
  isCorrectReading,
  memoryKey,
  type Attempt,
  type Progress,
  type Question,
  type SessionCourseId,
} from "../lib/learning";
import { playJapanese, playTones, stopAudio } from "../lib/audio";
import Modal from "./Modal";

export interface ActiveSession {
  id: string;
  chapter: SessionCourseId;
  questions: Question[];
}
export function ToneLine({
  tones,
  morae,
}: {
  tones: ("H" | "L")[];
  morae: string[];
}) {
  return (
    <div
      className="tone-diagram"
      aria-label={tones.map((t) => (t === "H" ? "高" : "低")).join("、")}
    >
      <svg viewBox={`0 0 ${tones.length * 80} 90`}>
        <polyline
          points={tones
            .map((tone, i) => `${i * 80 + 40},${tone === "H" ? 20 : 60}`)
            .join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        {tones.map((tone, i) => (
          <circle
            key={i}
            cx={i * 80 + 40}
            cy={tone === "H" ? 20 : 60}
            r="6"
            fill="currentColor"
          />
        ))}
      </svg>
      <div>
        {morae.map((m, i) => (
          <span key={i}>
            {m}
            <small>{tones[i] === "H" ? "高" : "低"}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
export function MoraBoxes({ morae }: { morae: string[] }) {
  return (
    <div className="mora-boxes">
      {morae.map((mora, i) => (
        <span
          className={
            ["っ", "ッ", "ー", "ん", "ン"].includes(mora) ? "special" : ""
          }
          key={i}
        >
          <b>{mora}</b>
          <small>{i + 1} 拍</small>
        </span>
      ))}
    </div>
  );
}

export default function Practice({
  session,
  progress,
  onAttempt,
  onFinish,
  onExit,
  onRestart,
  hasVoice,
  onSpeak,
}: {
  session: ActiveSession;
  progress: Progress;
  onAttempt: (attempt: Attempt) => void;
  onFinish: (attempts: Attempt[]) => void;
  onExit: () => void;
  onRestart: () => void;
  hasVoice: boolean;
  onSpeak: (text: string, id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Attempt[]>([]);
  const newItems = [
    ...new Map(
      session.questions
        .filter(
          (q) => q.kana && !progress.memories[memoryKey(q.itemId, q.direction)],
        )
        .map((q) => [q.itemId, q.kana!]),
    ).values(),
  ].slice(0, 6);
  const newWords = [
    ...new Map(
      session.questions
        .filter(
          (q) =>
            q.entry &&
            !q.entry.options &&
            !progress.memories[memoryKey(q.itemId, q.direction)],
        )
        .map((q) => [q.itemId, q.entry!]),
    ).values(),
  ].slice(0, 5);
  const [phase, setPhase] = useState<"learn" | "play" | "done">(
    newItems.length || newWords.length ? "learn" : "play",
  );
  const [confirmExit, setConfirmExit] = useState(false);
  const title =
    chapters.find((c) => c.id === session.chapter)?.name ||
    lessonById.get(session.chapter as LessonId)?.title ||
    (session.chapter === "review" ? "到期复习" : "今日小冒险");
  const recorded = useRef(false);
  useEffect(() => () => stopAudio(), []);
  const finish = () => {
    if (!recorded.current) {
      onFinish(results);
      recorded.current = true;
    }
    setPhase("done");
  };
  const correct = results.filter((a) => a.correct).length;
  return (
    <div className="practice-page">
      <div className="practice-top">
        <button
          className="text-button"
          onClick={() =>
            phase === "done" || !results.length
              ? onExit()
              : setConfirmExit(true)
          }
        >
          <ArrowLeft size={17} /> 返回小岛
        </button>
        <span>{title}</span>
        <span className="eyebrow">一步一步，就会记住</span>
      </div>
      {phase === "learn" ? (
        <div className="learn-intro panel">
          <span className="section-kicker">
            <Sparkles size={15} /> 出发前，认识几位新朋友
          </span>
          <h1>先认识，再试着回忆。</h1>
          <p>
            看看字形，读一遍声音。暂时记不住也没关系，接下来会再次遇见它们。
          </p>
          <div
            className={`intro-kana-grid ${newItems.length ? "" : "empty-kana-grid"}`}
          >
            {newItems.map((item) => (
              <div className="intro-kana" key={item.id}>
                <span lang="ja">{item.glyph}</span>
                <b>{item.reading}</b>
                <button
                  className="icon-button"
                  aria-label={`朗读 ${item.glyph}`}
                  onClick={() => onSpeak(item.glyph, item.id)}
                >
                  <Volume2 size={18} />
                </button>
                <small>
                  {item.script === "hiragana" ? "平假名" : "片假名"} ·{" "}
                  {item.kind === "voiced"
                    ? "浊音 / 半浊音"
                    : item.kind === "yoon"
                      ? "拗音"
                      : "清音 / 拨音"}
                </small>
              </div>
            ))}
          </div>
          {newWords.length > 0 && (
            <div className="intro-kana-grid study-intro-grid">
              {newWords.map((item) => (
                <div className="intro-kana intro-study" key={item.id}>
                  <small>{kindLabels[item.kind]}</small>
                  <span lang="ja">{item.character || item.term}</span>
                  {item.character && <strong lang="ja">{item.term}</strong>}
                  <b lang="ja">{item.reading}</b>
                  <p>{item.meaning}</p>
                  <button
                    className="icon-button"
                    aria-label={`朗读 ${item.term}`}
                    onClick={() => onSpeak(item.term, item.id)}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {!hasVoice && (
            <p className="muted-note">
              设备暂未提供日语声音，可先练字形与读音；到「小岛设置」查看音频说明。
            </p>
          )}
          <button className="primary-button" onClick={() => setPhase("play")}>
            准备好了，开始练习 <ArrowRight size={17} />
          </button>
        </div>
      ) : phase === "done" ? (
        <div className="completion panel">
          <div className="completion-mark">
            <Sparkles size={42} />
          </div>
          <span className="section-kicker">又向前走了一小步</span>
          <h1>这次冒险，完成！</h1>
          <p>回忆发生的每一次，都是在为下次更快认出它铺路。</p>
          <div className="earned-shells">
            <Sparkles size={17} /> 本轮获得{" "}
            {progress.sessions.find((s) => s.id === session.id)?.reward || 0}{" "}
            枚贝壳 <small>可在「收藏小屋」兑换装饰</small>
          </div>
          {progress.garden.stamps.includes(session.chapter) && (
            <p className="stamp-earned">本关纪念章已收入你的旅行护照。</p>
          )}
          <div className="result-stats">
            <div>
              <b>{results.length}</b>
              <span>完成题目</span>
            </div>
            <div>
              <b>
                {results.length
                  ? Math.round((correct / results.length) * 100)
                  : 0}
                <small>%</small>
              </b>
              <span>正确率</span>
            </div>
            <div>
              <b>
                {results.filter((a) => a.hinted || a.slow || !a.correct).length}
              </b>
              <span>值得再练</span>
            </div>
          </div>
          {results.some((a) => !a.correct || a.hinted) && (
            <div className="result-review">
              <b>下次再见这些朋友</b>
              <div>
                {[
                  ...new Set(
                    results
                      .filter((a) => !a.correct || a.hinted)
                      .map(
                        (a) =>
                          session.questions.find((q) => q.itemId === a.itemId)
                            ?.kana?.glyph ||
                          session.questions.find((q) => q.itemId === a.itemId)
                            ?.concept?.display ||
                          session.questions.find((q) => q.itemId === a.itemId)
                            ?.entry?.term,
                      ),
                  ),
                ].map((glyph) => (
                  <span key={glyph} lang="ja">
                    {glyph}
                  </span>
                ))}
              </div>
              <p>已加入短间隔复习，约 5 分钟后可在「到期复习」中重遇。</p>
            </div>
          )}
          <div className="button-row">
            <button className="secondary-button" onClick={onRestart}>
              <RotateCcw size={16} /> 再来一轮
            </button>
            <button className="primary-button" onClick={onExit}>
              回到我的小岛 <ArrowRight size={17} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="question-progress">
            <div>
              <span>
                正在探索 ·{" "}
                {session.questions[index].entry
                  ? `${kindLabels[session.questions[index].entry!.kind]} · ${session.questions[index].direction === "read" ? "认读" : session.questions[index].direction === "meaning" ? "意思理解" : "场景理解"}`
                  : session.questions[index].direction === "concept"
                    ? session.questions[index].concept?.label
                    : session.questions[index].direction === "listen"
                      ? "听音辨认"
                      : "看字回忆"}
              </span>
              <span>
                {index + 1}
                <small> / {session.questions.length}</small>
              </span>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${(index / session.questions.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <Round
            key={session.questions[index].id}
            question={session.questions[index]}
            progress={progress}
            sessionId={session.id}
            hasVoice={hasVoice}
            onSpeak={onSpeak}
            onAnswer={(attempt) => {
              setResults((old) => [...old, attempt]);
              onAttempt(attempt);
            }}
            onNext={() =>
              index + 1 === session.questions.length
                ? finish()
                : setIndex(index + 1)
            }
            last={index + 1 === session.questions.length}
          />
        </>
      )}
      {confirmExit && (
        <Modal title="结束本轮练习" onClose={() => setConfirmExit(false)}>
          <h2>要先回小岛休息吗？</h2>
          <p>已完成的答题记录会保留，本轮尚未完成的题目不会计入。</p>
          <div className="button-column">
            <button
              className="secondary-button"
              onClick={() => setConfirmExit(false)}
            >
              继续练习
            </button>
            <button className="primary-button" onClick={onExit}>
              保存并返回
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Round({
  question: q,
  progress,
  sessionId,
  hasVoice,
  onSpeak,
  onAnswer,
  onNext,
  last,
}: {
  question: Question;
  progress: Progress;
  sessionId: string;
  hasVoice: boolean;
  onSpeak: (text: string, id: string) => void;
  onAnswer: (a: Attempt) => void;
  onNext: () => void;
  last: boolean;
}) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState(progress.settings.inputMode);
  const [hinted, setHinted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [slow, setSlow] = useState(false);
  const [heard, setHeard] = useState(false);
  const [result, setResult] = useState<Attempt | null>(null);
  const locked = useRef(false);
  const started = useRef(performance.now());
  const pausedAt = useRef<number | null>(null);
  const pausedTotal = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const isTyping = q.direction === "read" && mode === "typing";
  useEffect(() => {
    const pause = () => {
      if (document.hidden) pausedAt.current = performance.now();
      else if (pausedAt.current !== null) {
        pausedTotal.current += performance.now() - pausedAt.current;
        pausedAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", pause);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener("visibilitychange", pause);
      stopAudio();
    };
  }, []);
  useEffect(() => {
    if (result) nextRef.current?.focus();
  }, [result]);
  const submit = (answer: string) => {
    if (
      locked.current ||
      !answer.trim() ||
      (q.direction === "listen" && !heard)
    )
      return;
    locked.current = true;
    const elapsed = Math.max(
      0,
      performance.now() - started.current - pausedTotal.current,
    );
    const attempt: Attempt = {
      id: crypto.randomUUID(),
      sessionId,
      itemId: q.itemId,
      direction: q.direction,
      answer,
      correct:
        q.kana && q.direction === "read"
          ? isCorrectReading(q.kana, answer)
          : q.entry && q.direction === "read"
            ? isCorrectEntryReading(q.entry, answer)
            : answer === q.expected,
      hinted,
      slow:
        slow ||
        elapsed >
          (q.entry
            ? q.entry.options || q.entry.kind === "phrase"
              ? 90_000
              : 30_000
            : 10_000),
      elapsed,
      at: Date.now(),
    };
    stopAudio();
    setResult(attempt);
    onAnswer(attempt);
    if (attempt.correct && q.direction === "read" && progress.settings.sound) {
      const text = q.kana?.glyph || q.entry?.term;
      if (text) onSpeak(text, q.itemId);
    }
  };
  const hint = () => {
    setHinted(true);
    setShowHint(true);
  };
  const play = () => {
    if (!q.kana) return;
    if (playJapanese(q.kana.glyph, q.itemId, progress.settings.voiceURI)) {
      if (!heard) {
        started.current = performance.now();
        pausedTotal.current = 0;
      }
      setHeard(true);
    }
  };
  return (
    <section className="round panel" data-entry-id={q.entry?.id}>
      <div className="round-label">
        {q.kana
          ? `${q.kana.script === "hiragana" ? "平假名" : "片假名"} / ${q.kana.kind === "basic" ? "清音 · 拨音" : q.kana.kind === "voiced" ? "浊音 · 半浊音" : "拗音"}`
          : q.entry
            ? `${q.entry.lessonId.startsWith("care-") ? "介护特定技能入门" : "N4 目标学习包"} / ${kindLabels[q.entry.kind]}`
            : "日语发音小课堂"}
      </div>
      <h1 className="question-title">
        {(q.entry
          ? q.entry.options
            ? q.entry.prompt
            : q.direction === "read"
              ? "读出这个词的完整读音。"
              : "这个表达是什么意思？"
          : undefined) ||
          q.concept?.prompt ||
          (q.direction === "listen"
            ? "听一听，你听到了哪一个？"
            : "这个假名，怎么读？")}
      </h1>
      {q.direction === "listen" ? (
        <button
          className="listen-orb"
          aria-label="播放题目声音"
          disabled={!hasVoice}
          onClick={play}
        >
          <Headphones size={42} />
          <small>{heard ? "再听一次" : "点我听声音"}</small>
        </button>
      ) : (
        <div
          className={`question-glyph ${q.concept || q.entry ? "word" : ""} ${q.entry ? "study-question-glyph" : ""}`}
          lang="ja"
        >
          {q.kana?.glyph ||
            q.concept?.display ||
            (q.entry?.options
              ? q.entry.kind === "grammar"
                ? "句型练习"
                : q.entry.term
              : q.entry?.term)}
          {q.entry?.character && (
            <small>汉字「{q.entry.character}」· 按词语读音练习</small>
          )}
          {q.entry && q.direction === "read" && (
            <small className="reading-context">语境：{q.entry.meaning}</small>
          )}
          {q.entry && q.direction === "meaning" && (
            <small lang="ja">{q.entry.reading}</small>
          )}
        </div>
      )}
      {q.entry?.options && (
        <div
          className={`reading-passage ${q.entry.kind === "grammar" ? "cloze-passage" : ""}`}
          lang={q.entry.kind === "scenario" ? "zh-CN" : "ja"}
        >
          {q.entry.example}
        </div>
      )}
      {q.entry && !q.entry.options && result && (
        <button
          className="text-button pronunciation"
          onClick={() => onSpeak(q.entry!.term, q.itemId)}
        >
          <Volume2 size={17} /> 听参考读音
        </button>
      )}
      {q.kana && q.direction === "read" && result && (
        <button
          className="text-button pronunciation"
          onClick={() => onSpeak(q.kana!.glyph, q.itemId)}
        >
          <Volume2 size={17} /> 听参考读音
        </button>
      )}
      {q.direction === "listen" && (
        <p className="muted-note">
          日语合成参考音 · 用于辅助辨认，不能作为声调标准
          {!hasVoice && "；设备声音不可用，请返回后选择看字练习。"}
        </p>
      )}
      {!result && (
        <>
          {isTyping ? (
            <form
              className="answer-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
            >
              <label htmlFor="reading-input">
                {q.entry ? "输入假名或罗马字" : "输入罗马字读音"}
              </label>
              <div className="answer-input-row">
                <input
                  id="reading-input"
                  ref={inputRef}
                  maxLength={q.entry ? 100 : 24}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    q.entry ? "例如：まいにち / mainichi" : "例如：ga"
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.nativeEvent.isComposing)
                      e.preventDefault();
                  }}
                  aria-describedby="input-help"
                />
                <button
                  className="primary-button"
                  disabled={!input.trim()}
                  type="submit"
                >
                  确认 <ArrowRight size={18} />
                </button>
              </div>
              <small id="input-help">
                {q.entry
                  ? "按 Enter 确认 · 支持平假名、片假名和基本罗马字"
                  : "按 Enter 确认 · 支持 shi / si、chi / ti 等常见写法"}
              </small>
            </form>
          ) : (
            <div
              className={`answer-options ${q.direction === "listen" ? "glyph-options" : ""}`}
            >
              {q.options.map((option, i) => (
                <button
                  key={option}
                  disabled={q.direction === "listen" && !heard}
                  onClick={() => submit(option)}
                >
                  <small>{String.fromCharCode(65 + i)}</small>
                  <span lang={q.direction === "listen" ? "ja" : undefined}>
                    {option}
                  </span>
                </button>
              ))}
            </div>
          )}
          <div className="round-tools">
            <button className="text-button" onClick={hint}>
              <CircleHelp size={16} />{" "}
              {showHint ? "提示已展开" : "给我一点提示"}
            </button>
            {q.direction === "read" && (
              <button
                className="text-button"
                onClick={() => {
                  if (mode === "typing") setHinted(true);
                  setMode(mode === "typing" ? "choice" : "typing");
                }}
              >
                {mode === "typing" ? (
                  <ListChecks size={16} />
                ) : (
                  <Keyboard size={16} />
                )}
                {mode === "typing" ? "换成选项" : "改用输入"}
              </button>
            )}
            <label className="slow-check">
              <input
                type="checkbox"
                checked={slow}
                onChange={(e) => setSlow(e.target.checked)}
              />{" "}
              想了一下
            </label>
          </div>
          {showHint && (
            <div className="hint-box">
              {q.kana ? (
                <>
                  <b>{q.kana.reading}</b>
                  <p>{q.kana.hint}</p>
                </>
              ) : (
                <p>
                  {q.entry
                    ? `${q.expected}。${q.entry.note || q.entry.meaning}`
                    : q.concept?.explanation}
                </p>
              )}
            </div>
          )}
        </>
      )}
      {result && (
        <div
          className={`answer-feedback ${result.correct ? "correct" : "incorrect"}`}
          role="status"
        >
          <div className="feedback-title">
            {result.correct ? <Check size={21} /> : <X size={21} />}
            <b>
              {result.correct
                ? result.hinted
                  ? "答对了，下次试着独立回忆"
                  : result.slow
                    ? "答对了，慢慢会更熟悉"
                    : "答对了！又记牢一点"
                : "没关系，重新认识一下"}
            </b>
          </div>
          <p>
            {result.correct
              ? "正确答案："
              : `你的答案：${result.answer}　·　正确答案：`}
            <strong>{q.expected}</strong>
          </p>
          <p>
            {q.kana?.hint ||
              q.concept?.explanation ||
              q.entry?.note ||
              q.entry?.meaning}
          </p>
          {q.entry?.readingAliases?.length ? (
            <p className="block-note">
              也接受读法：{q.entry.readingAliases.join(" / ")}
            </p>
          ) : null}
          {q.entry && !q.entry.options && (
            <p className="entry-feedback-meaning">
              <b lang="ja">{q.entry.term}</b> ·{" "}
              <span lang="ja">{q.entry.reading}</span>
              <br />
              {q.entry.meaning}
            </p>
          )}
          {q.concept?.morae &&
            (q.concept.tones ? (
              <>
                <ToneLine tones={q.concept.tones} morae={q.concept.morae} />
                <button
                  className="text-button"
                  onClick={() => void playTones(q.concept!.tones!)}
                >
                  <Volume2 size={16} /> 播放高低示意音
                </button>
                <small className="block-note">
                  示意音为纯音，用于理解高低；不是日语真人发音。
                </small>
              </>
            ) : (
              <MoraBoxes morae={q.concept.morae} />
            ))}
          {q.concept?.compare && (
            <div className="compare-mora">
              <span>对比：{q.concept.compare.text}</span>
              <MoraBoxes morae={q.concept.compare.morae} />
            </div>
          )}
          <button ref={nextRef} className="primary-button" onClick={onNext}>
            {last ? "看看本轮收获" : "下一题"} <ArrowRight size={17} />
          </button>
        </div>
      )}
    </section>
  );
}
