import { ArrowRight, Check, Heart, Leaf, Shell, Star } from "lucide-react";
import { useState } from "react";
import { chapters } from "../data/curriculum";
import { lessons } from "../data/catalog";
import {
  decorations,
  decorationById,
  gardenSlots,
  type GardenSlot,
} from "../data/game";
import type { Progress } from "../lib/learning";
import { courseStats, shellBalance } from "../lib/game";
import { favoriteEntries } from "./StudyLibrary";

export default function Collection({
  progress,
  onBuy,
  onPlace,
  onLibrary,
}: {
  progress: Progress;
  onBuy: (id: string) => void;
  onPlace: (slot: GardenSlot, id: string | null) => void;
  onLibrary: () => void;
}) {
  const [slot, setSlot] = useState<GardenSlot>("garden");
  const [tab, setTab] = useState<"shop" | "passport">("shop");
  const balance = shellBalance(progress);
  const courses = [
    ...chapters.map((c) => ({ id: c.id, title: c.name, glyph: c.glyph })),
    ...lessons.map((l) => ({ id: l.id, title: l.title, glyph: l.glyph })),
  ];
  const collected = courses.filter(
    (c) =>
      progress.garden.stamps.includes(c.id) ||
      courseStats(c.id, progress).stars > 0,
  );
  const favorites = favoriteEntries(progress);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="section-kicker">
            LITTLE REWARDS, LASTING MEMORIES
          </span>
          <h1>让努力，变成小岛上的风景。</h1>
          <p>练习获得贝壳，装点自己的小屋。每一枚纪念章，都有一段走过的路。</p>
        </div>
        <div className="wallet" aria-label={`贝壳余额 ${balance}`}>
          <Shell size={23} />
          <b>{balance}</b>
          <span>贝壳</span>
        </div>
      </div>
      <section className="garden-panel panel">
        <div className="card-heading">
          <h2>我的小岛小屋</h2>
          <span className="section-kicker">
            已收集 {progress.garden.owned.length} / {decorations.length} 件装饰
          </span>
        </div>
        <div className="garden-scene">
          <svg
            viewBox="0 0 900 400"
            aria-label="小屋、花园与可以摆放装饰的四个区域"
            role="img"
          >
            <defs>
              <linearGradient id="garden-sky" x2="0" y2="1">
                <stop stopColor="#eef3e3" />
                <stop offset="1" stopColor="#faf8eb" />
              </linearGradient>
            </defs>
            <rect width="900" height="400" rx="20" fill="url(#garden-sky)" />
            <circle cx="756" cy="73" r="34" fill="#f0e6bf" />
            <path
              d="M0 232Q130 140 274 218T574 200 900 214V400H0Z"
              fill="#dce7cb"
            />
            <path
              d="M0 280Q180 208 360 280T650 254 900 277V400H0Z"
              fill="#ccdcbc"
            />
            <path
              d="M0 365q190-60 340-10t273-13q124-60 287-8v66H0Z"
              fill="#bfd2ad"
            />
            <path
              d="M65 400Q210 295 400 278T704 400"
              fill="none"
              stroke="#e6dfc5"
              strokeWidth="39"
            />
            <g transform="translate(310 120)">
              <path d="M-50 37H183V165H-50Z" fill="#f5f0db" />
              <path d="M-78 44 68-37 212 44Z" fill="#7c9682" />
              <path
                d="M-64 43 68-24 197 43"
                fill="none"
                stroke="#a0b097"
                strokeWidth="7"
              />
              <path d="M48 83h43v82H48Z" fill="#a4ad8d" />
              <path
                d="M-21 80h41v41h-41Zm140 0h41v41h-41Z"
                fill="#c5d6bf"
                stroke="#e4ddc7"
                strokeWidth="6"
              />
              <path
                d="M-1 79v43m-21-22h43m119-21v43m-20-22h42"
                stroke="#f7f2df"
                strokeWidth="4"
              />
              <circle cx="81" cy="127" r="3" fill="#ede5cd" />
              <path d="M53 166h34v10H53" fill="#d2c3a5" />
            </g>
            <g fill="#95b18b">
              <path d="M95 198v75" stroke="#9e9d76" strokeWidth="9" />
              <circle cx="95" cy="185" r="41" />
              <circle cx="67" cy="206" r="29" />
              <circle cx="125" cy="209" r="29" />
              <path d="M806 184v99" stroke="#9e9d76" strokeWidth="9" />
              <circle cx="808" cy="181" r="42" />
              <circle cx="783" cy="203" r="29" />
              <circle cx="837" cy="204" r="29" />
            </g>
            <g fill="#e9edd8">
              <circle cx="138" cy="316" r="4" />
              <circle cx="168" cy="288" r="3" />
              <circle cx="600" cy="326" r="4" />
              <circle cx="710" cy="279" r="3" />
            </g>
            <g fill="none" stroke="#a8b99a" strokeWidth="2">
              <path d="m661 66 8-4 8 4m0 0 8-4 8 4M186 90l6-4 6 4m0 0 6-4 6 4" />
            </g>
          </svg>
          {gardenSlots.map((place, i) => {
            const positions = [
              [24, 73],
              [43, 59],
              [66, 63],
              [82, 82],
            ];
            const item = progress.garden.placements[place.id];
            return (
              <button
                className={`garden-placement ${slot === place.id ? "selected" : ""}`}
                key={place.id}
                style={{
                  left: `${positions[i][0]}%`,
                  top: `${positions[i][1]}%`,
                }}
                aria-label={`选择摆放位置 ${place.label}`}
                aria-pressed={slot === place.id}
                onClick={() => setSlot(place.id)}
              >
                {item ? (
                  <DecorationArt id={item} />
                ) : (
                  <span className="empty-placement">＋</span>
                )}
                <small>{place.label}</small>
              </button>
            );
          })}
        </div>
        <div className="placement-controls">
          <label>
            当前摆放位置
            <select
              aria-label="当前摆放位置"
              value={slot}
              onChange={(e) => setSlot(e.target.value as GardenSlot)}
            >
              {gardenSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <span>
            {progress.garden.placements[slot]
              ? `正在展示：${decorationById.get(progress.garden.placements[slot]!)?.name}`
              : "还空着，选一件喜欢的装饰吧。"}
          </span>
          <button
            className="text-button"
            disabled={!progress.garden.placements[slot]}
            onClick={() => onPlace(slot, null)}
          >
            收回装饰
          </button>
        </div>
      </section>
      <div className="collection-tabs">
        <div className="tabs">
          <button
            className={tab === "shop" ? "active" : ""}
            onClick={() => setTab("shop")}
          >
            小岛杂货铺
          </button>
          <button
            className={tab === "passport" ? "active" : ""}
            onClick={() => setTab("passport")}
          >
            旅行护照 · {collected.length}/{courses.length}
          </button>
        </div>
        <span>
          <Shell size={14} /> 完成一轮 ≥6 题可得贝壳，每日最多 60 枚
        </span>
      </div>
      {tab === "shop" ? (
        <>
          <div className="decoration-grid">
            {decorations.map((item) => {
              const owned = progress.garden.owned.includes(item.id);
              const placed = progress.garden.placements[slot] === item.id;
              return (
                <article
                  className={`decoration-card panel ${owned ? "owned" : ""}`}
                  key={item.id}
                >
                  <span className="decoration-status">
                    {owned ? (
                      <>
                        <Check size={12} /> 已收藏
                      </>
                    ) : (
                      <>
                        <Shell size={12} /> {item.cost}
                      </>
                    )}
                  </span>
                  <DecorationArt id={item.id} />
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  {owned ? (
                    <button
                      className="secondary-button"
                      disabled={placed}
                      onClick={() => onPlace(slot, item.id)}
                    >
                      {placed
                        ? "已摆放在此处"
                        : `摆到${gardenSlots.find((s) => s.id === slot)?.label}`}
                    </button>
                  ) : (
                    <button
                      className="primary-button"
                      disabled={balance < item.cost}
                      aria-label={`兑换${item.name}，${item.cost}枚贝壳`}
                      onClick={() => onBuy(item.id)}
                    >
                      {balance < item.cost ? (
                        `还差 ${item.cost - balance} 枚贝壳`
                      ) : (
                        <>
                          <Shell size={14} /> {item.cost} 贝壳兑换
                        </>
                      )}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <p className="below-note">
            贝壳是本机游戏内奖励，没有付费功能。每轮奖励为 5
            枚加答对题数（最多加 12），每日总奖励上限
            60。摆放会移动同一件装饰，不会复制；收回后仍在收藏中。
          </p>
        </>
      ) : (
        <div className="passport panel">
          <div className="passport-heading">
            <Star size={25} />
            <div>
              <h2>走过的每一站，都值得留下纪念。</h2>
              <p>
                在一关完成至少 6 题（小关卡按实际数量），正确率达到
                60%，即可收集该站纪念章。
              </p>
            </div>
          </div>
          <div className="stamp-grid">
            {courses.map((course) => {
              const earned = collected.some((c) => c.id === course.id);
              return (
                <div
                  className={`travel-stamp ${earned ? "earned" : ""}`}
                  key={course.id}
                >
                  <span lang="ja">{course.glyph}</span>
                  <b>{course.title}</b>
                  <small>{earned ? "已收集" : "等待出发"}</small>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <section className="favorite-preview panel">
        <div className="card-heading">
          <h2>
            <Heart size={17} /> 我的词条收藏 · {favorites.length}
          </h2>
          <button className="text-button" onClick={onLibrary}>
            去课程词库 <ArrowRight size={14} />
          </button>
        </div>
        {favorites.length ? (
          <div>
            {favorites.slice(0, 12).map((entry) => (
              <span key={entry.id} lang="ja">
                {entry.term}
              </span>
            ))}
          </div>
        ) : (
          <p>
            <Leaf size={16} /> 在课程词库点击爱心，把还想再见一面的词语收进来。
          </p>
        )}
      </section>
    </>
  );
}

export function DecorationArt({ id }: { id: string }) {
  const item = decorationById.get(id);
  if (!item) return null;
  const color = item.color;
  return (
    <svg
      className="decoration-art"
      viewBox="0 0 120 110"
      aria-label={item.name}
      role="img"
    >
      <ellipse cx="60" cy="96" rx="38" ry="9" fill="#8fa285" opacity=".12" />
      {item.type === "plant" && (
        <>
          <path d="M41 68h39l-7 28H48Z" fill="#c49b7b" />
          <path d="M60 70V34" stroke="#78956d" strokeWidth="4" />
          <path
            d="M59 52Q26 52 31 27 61 24 59 52M62 42Q60 14 89 17 93 44 62 49"
            fill={color}
          />
          <path
            d="m34 31 25 22m4-9 22-22"
            stroke="#edf0d9"
            strokeWidth="2"
            fill="none"
          />
        </>
      )}
      {item.type === "flower" && (
        <>
          <path d="M43 69h34l-6 27H49Z" fill="#d0b091" />
          <path
            d="M59 72V35m0 26-15-9m15 4 14-12"
            stroke="#94aa7b"
            strokeWidth="3"
          />
          <g fill={color}>
            <circle cx="59" cy="25" r="11" />
            <circle cx="48" cy="37" r="11" />
            <circle cx="71" cy="37" r="11" />
            <circle cx="59" cy="45" r="11" />
          </g>
          <circle cx="59" cy="36" r="8" fill="#ebd9a5" />
        </>
      )}
      {item.type === "lantern" && (
        <>
          <path
            d="M57 30v62m-15 2h32"
            stroke="#87977f"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="M42 27h34l-3 36H45Z" fill={color} />
          <path d="m38 25 21-12 21 12Z" fill="#8f9c83" />
          <path d="M51 33v22m16-22v22" stroke="#f5e8b9" strokeWidth="3" />
          <path d="M43 64h33" stroke="#a99874" strokeWidth="4" />
        </>
      )}
      {item.type === "books" && (
        <>
          <rect x="29" y="75" width="66" height="16" rx="3" fill="#c7ad8b" />
          <rect x="32" y="60" width="58" height="14" rx="3" fill={color} />
          <rect x="28" y="43" width="62" height="15" rx="3" fill="#b8c59e" />
          <path
            d="M39 49h44m-44 17h40m-39 16h48"
            stroke="#f2ecd9"
            strokeWidth="3"
          />
          <path d="m57 45 8 12 6-11" fill="#c99379" />
        </>
      )}
      {item.type === "cat" && (
        <>
          <ellipse cx="60" cy="79" rx="29" ry="17" fill={color} />
          <path
            d="M79 75q23-22 26-7t-15 19"
            fill="none"
            stroke={color}
            strokeWidth="11"
            strokeLinecap="round"
          />
          <circle cx="40" cy="66" r="18" fill={color} />
          <path d="m24 55 2-17 14 14m1 0 14-14 2 20" fill={color} />
          <path
            d="m29 67 6 2m12-2-6 2m-5 6h4"
            fill="none"
            stroke="#6d7968"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
      {item.type === "tree" && (
        <>
          <path
            d="M59 47v46m-10 0h21"
            stroke="#a39276"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <circle cx="60" cy="36" r="24" fill={color} />
          <circle cx="37" cy="47" r="20" fill={color} />
          <circle cx="82" cy="48" r="20" fill={color} />
          <g fill="#f4d9d8">
            <circle cx="49" cy="26" r="4" />
            <circle cx="69" cy="45" r="4" />
            <circle cx="37" cy="49" r="3" />
          </g>
        </>
      )}
      {item.type === "pond" && (
        <>
          <ellipse cx="59" cy="79" rx="43" ry="20" fill="#b6c5a5" />
          <ellipse cx="59" cy="76" rx="36" ry="16" fill={color} />
          <ellipse
            cx="60"
            cy="76"
            rx="23"
            ry="9"
            fill="none"
            stroke="#c8e0d3"
            strokeWidth="2"
          />
          <path d="M43 75q-6-10 6-10 12 0 6 10Z" fill="#829c75" />
          <path
            d="M85 68v-30m-5 10 5-10 5 10"
            fill="none"
            stroke="#9eaf83"
            strokeWidth="3"
          />
        </>
      )}
      {item.type === "bridge" && (
        <>
          <ellipse cx="59" cy="87" rx="44" ry="11" fill="#b8d3c8" />
          <path
            d="M20 82Q59 30 101 82"
            fill="none"
            stroke={color}
            strokeWidth="14"
          />
          <path
            d="M20 66Q59 17 101 66M22 66v22m19-42v25m19-32v26m20-19v25m18-7v22"
            fill="none"
            stroke="#9f8c6f"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
      {item.type === "bell" && (
        <>
          <path d="M60 14v22" stroke="#879980" strokeWidth="2" />
          <path d="M35 64q0-39 25-39 25 0 25 39Z" fill={color} />
          <path
            d="M60 63v19m-7 0h14v21H53Z"
            stroke="#9dad9b"
            fill="#e4d1bb"
            strokeWidth="2"
          />
          <path
            d="M44 47q8-13 17-13"
            fill="none"
            stroke="#e6e8df"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {item.type === "tea" && (
        <>
          <ellipse cx="57" cy="91" rx="37" ry="7" fill="#c9cfb4" />
          <path d="M32 49h49v24q-3 19-24 19T32 73Z" fill={color} />
          <path
            d="M81 56q25-1 15 16-4 7-15 6"
            fill="none"
            stroke={color}
            strokeWidth="6"
          />
          <ellipse cx="57" cy="49" rx="24" ry="6" fill="#718568" />
          <path
            d="M46 36q-9-10 0-20m20 20q-9-10 0-20"
            fill="none"
            stroke="#d2d5bf"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
      {item.type === "mailbox" && (
        <>
          <path
            d="M59 61v33m-12 0h26"
            stroke="#a59c81"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path d="M30 33q0-13 29-13h9q23 0 23 20v27H30Z" fill={color} />
          <path d="M42 40h38m-19 9h17" stroke="#f4e8d7" strokeWidth="3" />
          <path
            d="M88 29V14h15v11H88"
            stroke="#93a486"
            fill="#c6d3ab"
            strokeWidth="3"
          />
        </>
      )}
      {item.type === "lighthouse" && (
        <>
          <path d="m48 29-9 67h43l-9-67Z" fill="#f2eddb" />
          <path d="M44 56h33l3 16H42Z" fill={color} />
          <path d="M45 15h31v21H45Z" fill="#ead5a3" />
          <path d="m38 15 22-12 22 12Z" fill="#849c90" />
          <path d="M57 77h9v19h-9Z" fill="#99ac9b" />
          <path
            d="m40 23-22 9m63-9 22 9"
            stroke="#ebdfb6"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
