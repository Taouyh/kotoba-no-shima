import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Heart,
  Search,
  Volume2,
} from "lucide-react";
import {
  entriesForLesson,
  entryById,
  kindLabels,
  lessonById,
  lessons,
  resourceById,
  resources,
  studyEntries,
  type EntryKind,
  type LessonId,
  type StudyEntry,
  type TrackId,
} from "../data/catalog";
import type { Progress } from "../lib/learning";
import { romanize } from "../lib/reading";
import Modal from "./Modal";

export default function StudyLibrary({
  progress,
  initialLessonId,
  onFavorite,
  onPractice,
  onSpeak,
}: {
  progress: Progress;
  initialLessonId?: LessonId;
  onFavorite: (id: string) => void;
  onPractice: (entry: StudyEntry, direction: "read" | "meaning") => void;
  onSpeak: (text: string, id: string) => void;
}) {
  const [track, setTrack] = useState<TrackId>(
    initialLessonId?.startsWith("care-") ? "care" : "n4",
  );
  const [lessonFilter, setLessonFilter] = useState(initialLessonId || "all");
  const [kind, setKind] = useState<EntryKind | "all">("all");
  const [search, setSearch] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [showReadings, setShowReadings] = useState(true);
  const [selected, setSelected] = useState<StudyEntry | null>(null);
  const [page, setPage] = useState(1);
  const [showResources, setShowResources] = useState(false);
  const searchIndex = useMemo(
    () =>
      new Map(
        studyEntries.map((e) => [
          e.id,
          `${e.character || ""} ${e.term} ${e.reading} ${e.meaning} ${romanize(e.reading)}`.toLowerCase(),
        ]),
      ),
    [],
  );
  const filtered = studyEntries.filter(
    (entry) =>
      entry.lessonId.startsWith(track + "-") &&
      (kind === "all" || entry.kind === kind) &&
      (lessonFilter === "all" || entry.lessonId === lessonFilter) &&
      (!onlyFavorites || progress.favorites.includes(entry.id)) &&
      (!search.trim() ||
        searchIndex.get(entry.id)!.includes(search.trim().toLowerCase())),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 24));
  const visiblePage = Math.min(page, pages);
  const current = filtered.slice((visiblePage - 1) * 24, visiblePage * 24);
  const setNewSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-kicker">YOUR GROWING WORD BOOK</span>
          <h1>把词语，放回会用到的生活。</h1>
          <p>
            浏览与收藏不改变熟练度。选择一项，开始自由练习；地图解锁不会限制这里。
          </p>
        </div>
        <button
          className="secondary-button"
          onClick={() => setShowResources(!showResources)}
        >
          <BookOpen size={17} />
          {showResources ? "返回词库" : "官方资料"}
        </button>
      </div>
      <div className="library-toolbar panel">
        <div className="segmented">
          <button
            className={track === "n4" ? "active" : ""}
            onClick={() => {
              setTrack("n4");
              setLessonFilter("all");
              setPage(1);
            }}
          >
            N4 目标课程
          </button>
          <button
            className={track === "care" ? "active" : ""}
            onClick={() => {
              setTrack("care");
              setLessonFilter("all");
              setPage(1);
            }}
          >
            介护特定技能
          </button>
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="查找课程词条"
            value={search}
            onChange={(e) => setNewSearch(e.target.value)}
            placeholder="日语、读音、中文或罗马字…"
          />
        </label>
      </div>
      {showResources ? (
        <div className="resource-library panel">
          <h2>学习目标与参考入口</h2>
          <p>
            N4
            内容为自主整理的基础复习与目标扩展，官方未公布固定完整清单。介护以特定技能路线为目标，教材入口与勘误一并保留。
          </p>
          <div className="resource-grid">
            {resources
              .filter((r) => r.category === track)
              .map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer">
                  <div>
                    <b>{r.title}</b>
                    <small>
                      {r.publisher} · {r.checked} 核对
                    </small>
                    <p>{r.description}</p>
                  </div>
                  <ExternalLink size={15} />
                </a>
              ))}
          </div>
        </div>
      ) : (
        <>
          <div className="library-filters">
            <label>
              内容类型
              <select
                aria-label="内容类型"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as EntryKind | "all");
                  setPage(1);
                }}
              >
                <option value="all">全部类型</option>
                {Object.entries(kindLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              主题关卡
              <select
                aria-label="主题关卡"
                value={lessonFilter}
                onChange={(e) => {
                  setLessonFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">全部关卡</option>
                {lessons
                  .filter((l) => l.track === track)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
              </select>
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={(e) => {
                  setOnlyFavorites(e.target.checked);
                  setPage(1);
                }}
              />{" "}
              只看收藏
            </label>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showReadings}
                onChange={(e) => setShowReadings(e.target.checked)}
              />{" "}
              显示读音
            </label>
          </div>
          <div className="library-count">
            <span>{filtered.length} 个学习项</span>
            <small>
              {track === "n4"
                ? "基础复习与 N4 目标扩展 · 非官方完整词表"
                : "术语、表达与概念入门 · 非官方题库"}
            </small>
          </div>
          <div className="entry-grid">
            {current.map((entry) => (
              <article className="entry-card panel" key={entry.id}>
                <div className="entry-card-meta">
                  <span>{kindLabels[entry.kind]}</span>
                  <button
                    className={`icon-button favorite-button ${progress.favorites.includes(entry.id) ? "selected" : ""}`}
                    aria-label={`${progress.favorites.includes(entry.id) ? "取消收藏词条" : "收藏词条"} ${entry.term}`}
                    aria-pressed={progress.favorites.includes(entry.id)}
                    onClick={() => onFavorite(entry.id)}
                  >
                    <Heart
                      size={16}
                      fill={
                        progress.favorites.includes(entry.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>
                <button
                  className="entry-open"
                  onClick={() => setSelected(entry)}
                >
                  <span
                    className={`entry-term ${entry.term.length > 12 ? "long" : ""}`}
                    lang="ja"
                  >
                    {entry.character || entry.term}
                  </span>
                  {entry.character && <b lang="ja">{entry.term}</b>}
                  {showReadings && entry.reading && (
                    <small lang="ja">{entry.reading}</small>
                  )}
                  <p>{entry.meaning}</p>
                </button>
                <div className="entry-card-foot">
                  <span>{lessonById.get(entry.lessonId)?.title}</span>
                  <button
                    className="text-button"
                    onClick={() => setSelected(entry)}
                  >
                    查看 <ArrowRight size={12} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="empty-state panel">
              <Search size={30} />
              <h3>还没有找到这个词条</h3>
              <p>试试切换课程、内容类型，或清空主题筛选。</p>
              <button
                className="secondary-button"
                onClick={() => {
                  setNewSearch("");
                  setKind("all");
                  setLessonFilter("all");
                  setOnlyFavorites(false);
                }}
              >
                清空筛选
              </button>
            </div>
          )}
          <div className="pagination">
            <button
              className="secondary-button"
              disabled={visiblePage <= 1}
              onClick={() => {
                setPage(visiblePage - 1);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
            >
              上一页
            </button>
            <span>
              {visiblePage} / {pages}
            </span>
            <button
              className="secondary-button"
              disabled={visiblePage >= pages}
              onClick={() => {
                setPage(visiblePage + 1);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
            >
              下一页
            </button>
          </div>
        </>
      )}
      {selected && (
        <Modal
          title={`词条 ${selected.term}`}
          onClose={() => setSelected(null)}
        >
          <span className="section-kicker">
            {kindLabels[selected.kind]} ·{" "}
            {lessonById.get(selected.lessonId)?.title}
          </span>
          <h2 lang="ja">
            {selected.character
              ? `${selected.character} · ${selected.term}`
              : selected.term}
          </h2>
          {selected.reading && (
            <div className="word-detail-reading" lang="ja">
              {selected.reading}
              <button
                className="icon-button"
                aria-label="朗读词条"
                onClick={() => onSpeak(selected.term, selected.id)}
              >
                <Volume2 size={18} />
              </button>
            </div>
          )}
          <p>{selected.meaning}</p>
          {selected.example && (
            <div className="reading-passage" lang="ja">
              {selected.answer
                ? selected.example.replace("（　）", selected.answer)
                : selected.example}
            </div>
          )}
          {selected.note && (
            <div className="chapter-dialog-info">
              <p>{selected.note}</p>
            </div>
          )}
          <div className="entry-sources">
            参考范围：
            {selected.sourceIds.map((id) => {
              const resource = resourceById.get(id);
              return (
                resource && (
                  <a
                    key={id}
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {resource.title} <ExternalLink size={11} />
                  </a>
                )
              );
            })}
          </div>
          <div className="button-column">
            <button
              className="primary-button"
              onClick={() => {
                onPractice(
                  selected,
                  selected.kind === "phrase" || selected.options
                    ? "meaning"
                    : "read",
                );
                setSelected(null);
              }}
            >
              自由练习这项与同组伙伴 <ArrowRight size={16} />
            </button>
            <button
              className="secondary-button"
              onClick={() => onFavorite(selected.id)}
            >
              <Heart size={15} />
              {progress.favorites.includes(selected.id)
                ? "取消收藏"
                : "加入我的收藏"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export const studyNeighbors = (entry: StudyEntry) => [
  entry,
  ...entriesForLesson(entry.lessonId)
    .filter((e) => e.id !== entry.id)
    .slice(0, 4),
  entry,
];
export const favoriteEntries = (progress: Progress) =>
  progress.favorites.map((id) => entryById.get(id)!).filter(Boolean);
