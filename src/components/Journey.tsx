import {
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  LockKeyhole,
  Map,
  Sparkles,
  Star,
} from "lucide-react";
import {
  entriesForLesson,
  lessons,
  resources,
  studyEntries,
  type Lesson,
  type LessonId,
} from "../data/catalog";
import type { Progress } from "../lib/learning";
import { courseStats, lessonUnlocked } from "../lib/game";

export type World = "kana" | "n4" | "care";
export default function Journey({
  world,
  onWorld,
  progress,
  onSelect,
}: {
  world: World;
  onWorld: (world: World) => void;
  progress: Progress;
  onSelect: (lesson: Lesson) => void;
}) {
  const available = lessons.filter((l) => l.track === world);
  const groups = [...new Set(available.map((l) => l.group))];
  const entries = studyEntries.filter((e) =>
    available.some((l) => l.id === e.lessonId),
  );
  const unlocked = available.filter((l) =>
    lessonUnlocked(l.id, progress),
  ).length;
  return (
    <section className="world-section">
      <div className="world-tabs" aria-label="学习世界">
        {(
          [
            {
              id: "kana",
              name: "假名群岛",
              caption: "声音的起点",
              glyph: "あ",
            },
            {
              id: "n4",
              name: "N4 生活群岛",
              caption: "汉字到日常表达",
              glyph: "日",
            },
            {
              id: "care",
              name: "介护航线",
              caption: "特定技能入门",
              glyph: "介",
            },
          ] as const
        ).map((track) => (
          <button
            key={track.id}
            className={world === track.id ? "active" : ""}
            aria-pressed={world === track.id}
            onClick={() => onWorld(track.id)}
          >
            <span lang="ja">{track.glyph}</span>
            <div>
              <b>{track.name}</b>
              <small>{track.caption}</small>
            </div>
            <ArrowRight size={15} />
          </button>
        ))}
      </div>
      {world !== "kana" && (
        <>
          <div className={`world-banner ${world}`}>
            <div>
              <span className="section-kicker">
                {world === "n4"
                  ? "A LITTLE MORE, EVERY DAY"
                  : "YOUR NEXT HORIZON"}
              </span>
              <h2>
                {world === "n4"
                  ? "让熟悉的字，慢慢连成生活。"
                  : "把日语，带进关心他人的日常。"}
              </h2>
              <p>
                {world === "n4"
                  ? "包含基础复习和 N4 目标扩展；课程分级为本项目整理，不是官方完整词表。"
                  : "面向介护特定技能的语言与基础概念入门，分别练词语、会话和记录阅读。"}
              </p>
            </div>
            <div className="world-counter">
              <b>{entries.length}</b>
              <span>
                学习项 · {unlocked}/{available.length} 站已解锁
              </span>
            </div>
          </div>
          <div className="map-rule">
            <Map size={16} />
            <p>
              每条小径的首站可直接出发。完成一轮、正确率达到
              60%，即可获得第一颗星并解锁下一站；词库始终支持自由练习。左右滑动小径，可看后续站点。
            </p>
          </div>
          <div className="journey-routes">
            {groups.map((group) => (
              <section className="route-panel panel" key={group}>
                <header>
                  <div>
                    <span className="section-kicker">
                      {world === "n4" ? "N4 TARGET" : "CARE STARTER"}
                    </span>
                    <h3>{group}</h3>
                  </div>
                  <span>
                    {available.filter((l) => l.group === group).length} 个停靠点
                  </span>
                </header>
                <div className="route-scroll">
                  <div className="route-nodes">
                    {available
                      .filter((l) => l.group === group)
                      .map((lesson, index) => {
                        const stats = courseStats(lesson.id, progress);
                        const open = lessonUnlocked(lesson.id, progress);
                        return (
                          <button
                            className={`route-node ${open ? "unlocked" : "locked"} ${stats.stars > 0 ? "visited" : ""}`}
                            key={lesson.id}
                            data-lesson-id={lesson.id}
                            aria-label={`${lesson.title}，${open ? "可探索" : "待解锁"}，${stats.stars} 星`}
                            onClick={() => onSelect(lesson)}
                          >
                            <span className="route-index">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <IslandToken
                              glyph={lesson.glyph}
                              color={lesson.color}
                            />
                            <span className="route-title">{lesson.title}</span>
                            <small>{lesson.subtitle}</small>
                            <span
                              className="route-stars"
                              aria-label={`${stats.stars} 星`}
                            >
                              {[1, 2, 3].map((i) => (
                                <Star
                                  key={i}
                                  size={13}
                                  fill={
                                    i <= stats.stars ? "currentColor" : "none"
                                  }
                                  className={i <= stats.stars ? "earned" : ""}
                                />
                              ))}
                            </span>
                            <span className="route-status">
                              {open ? (
                                stats.seen ? (
                                  <>
                                    <Check size={11} /> 已探索 {stats.seen}/
                                    {stats.total}
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={11} /> {stats.total}{" "}
                                    个学习项
                                  </>
                                )
                              ) : (
                                <>
                                  <LockKeyhole size={11} /> 获得前站首星后解锁
                                </>
                              )}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </section>
            ))}
          </div>
          <p className="below-note">
            星星记录探索深度：第一星为完成关卡，第二星为探索至少 60%
            内容，第三星需至少 60% 内容经间隔复习达到熟练。解锁不代表已掌握。
          </p>
          {world === "care" && <CareResources />}
        </>
      )}
    </section>
  );
}

function IslandToken({ glyph, color }: { glyph: string; color: string }) {
  const colors: Record<string, string> = {
    orange: "#e2c7a3",
    blue: "#b8d1cc",
    pink: "#dec5cc",
    green: "#c6d6ad",
    purple: "#ccc7db",
    teal: "#afcfc2",
  };
  return (
    <svg className="island-token" viewBox="0 0 160 130" aria-hidden="true">
      <ellipse cx="80" cy="102" rx="62" ry="15" fill="#bfd5c7" opacity=".25" />
      <path d="M20 82q-5 21 60 27 65-7 60-27" fill="#d6c6a9" />
      <ellipse
        cx="80"
        cy="80"
        rx="62"
        ry="25"
        fill={colors[color] || colors.green}
      />
      <path d="m54 70 25-26 29 26v18H54Z" fill="#fffdf1" />
      <path
        d="m47 68 32-31 36 31"
        fill="none"
        stroke="#839b86"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <text
        x="80"
        y="82"
        textAnchor="middle"
        fontSize="28"
        fill="#6b866c"
        fontFamily="Yu Gothic,Microsoft YaHei,sans-serif"
      >
        {glyph}
      </text>
      <path
        d="M32 73v-15m-10 1 10-20 12 20Z"
        stroke="#87a27c"
        strokeWidth="3"
        fill="#a6bf96"
      />
      <path
        d="M131 80v-12m-9-1 9-16 9 16Z"
        stroke="#93aa80"
        strokeWidth="3"
        fill="#bad0a1"
      />
    </svg>
  );
}
export function CareResources() {
  return (
    <section className="care-resource-section panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">OFFICIAL STUDY DESK</span>
          <h2>介护备考资料桌</h2>
        </div>
        <BookOpen size={25} />
      </div>
      <div className="care-route-summary">
        <div>
          <b>01 · N4 基础</b>
          <p>先读懂日常话题，积累词汇、语法与阅读能力。</p>
        </div>
        <div>
          <b>02 · 介护日语评价</b>
          <p>介护词语、会话与声かけ、文书理解分别准备。</p>
        </div>
        <div>
          <b>03 · 介护技能评价</b>
          <p>介护基础、身心机制、沟通及生活支援需结合正式教材与培训。</p>
        </div>
      </div>
      <p className="care-scope">
        本区是原创入门练习，不是官方题库或完整模拟考试。实际操作另需正式学习与实训。资料核对日期：2026-10-24。
      </p>
      <div className="resource-grid">
        {resources
          .filter((r) => r.category === "care")
          .map((resource) => (
            <a
              href={resource.url}
              key={resource.id}
              target="_blank"
              rel="noreferrer"
            >
              <div>
                <b>{resource.title}</b>
                <small>{resource.publisher}</small>
                <p>{resource.description}</p>
              </div>
              <ExternalLink size={15} />
            </a>
          ))}
      </div>
    </section>
  );
}

export function LessonDialogBody({
  lesson,
  progress,
  onStart,
  onBrowse,
  onPrerequisite,
}: {
  lesson: Lesson;
  progress: Progress;
  onStart: (id: LessonId, direction: "read" | "meaning") => void;
  onBrowse: (id: LessonId) => void;
  onPrerequisite: (id: LessonId) => void;
}) {
  const open = lessonUnlocked(lesson.id, progress);
  const entries = entriesForLesson(lesson.id);
  const stats = courseStats(lesson.id, progress);
  const conceptual = !!entries[0]?.options;
  const phrase = entries[0]?.kind === "phrase";
  return (
    <>
      <div className={`chapter-dialog-symbol ${lesson.color}`} lang="ja">
        {lesson.glyph}
      </div>
      <span className="section-kicker">
        {lesson.track === "n4" ? "N4 目标学习包" : "介护特定技能入门"} ·{" "}
        {lesson.group}
      </span>
      <h2>{lesson.title}</h2>
      <p>{lesson.description}</p>
      <div className="chapter-dialog-info">
        <b>
          {entries.length} 个学习项 · 已探索 {stats.seen} 个 · {stats.stars} 星
        </b>
        <p>
          {open
            ? "每轮约 6–12 题，少量新内容先学习再练习。认读和意思理解分别记录；正确率达到 60% 可获得首星。"
            : `先在「${lessons.find((l) => l.id === lesson.prerequisite)?.title}」获得首星，即可解锁这站。你也可以现在去词库自由浏览。`}
        </p>
      </div>
      <div className="button-column">
        {open ? (
          <>
            <button
              className="primary-button"
              onClick={() => onStart(lesson.id, phrase ? "meaning" : "read")}
            >
              开始{conceptual ? "场景练习" : phrase ? "理解练习" : "认读练习"}{" "}
              <ArrowRight size={17} />
            </button>
            {!conceptual && !phrase && (
              <button
                className="secondary-button"
                onClick={() => onStart(lesson.id, "meaning")}
              >
                理解词义 <ArrowRight size={16} />
              </button>
            )}
          </>
        ) : (
          <button
            className="primary-button"
            onClick={() => onPrerequisite(lesson.prerequisite!)}
          >
            前往上一站 <ArrowRight size={16} />
          </button>
        )}
        <button
          className="text-button centered"
          onClick={() => onBrowse(lesson.id)}
        >
          <BookOpen size={15} /> 自由浏览本关内容
        </button>
      </div>
    </>
  );
}
