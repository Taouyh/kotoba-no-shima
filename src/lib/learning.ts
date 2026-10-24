import {
  kana,
  kanaById,
  kanaForChapter,
  conceptsForChapter,
  type ChapterId,
  type Kana,
  type Concept,
} from "../data/curriculum";
import {
  entryById,
  entriesForLesson,
  lessonById,
  lessons,
  studyEntries,
  type StudyEntry,
  type LessonId,
} from "../data/catalog";
import {
  newGarden,
  decorationById,
  gardenSlots,
  type Garden,
} from "../data/game";
import { isCorrectEntryReading } from "./reading";

export type Direction = "read" | "listen" | "concept" | "meaning";
export type CourseId = ChapterId | LessonId;
export type SessionCourseId = CourseId | "daily" | "review";
export interface Memory {
  key: string;
  itemId: string;
  direction: Direction;
  attempts: number;
  correct: number;
  stage: number;
  lastSeen: number;
  lastPromotion: number;
  due: number;
  confusions: Record<string, number>;
}
export interface Attempt {
  id: string;
  sessionId: string;
  itemId: string;
  direction: Direction;
  answer: string;
  correct: boolean;
  hinted: boolean;
  slow: boolean;
  elapsed: number;
  at: number;
}
export interface SessionSummary {
  id: string;
  chapter: SessionCourseId;
  at: number;
  completed: boolean;
  count: number;
  correct: number;
  reward?: number;
}
export interface Settings {
  sound: boolean;
  voiceURI: string;
  inputMode: "choice" | "typing";
}
export interface Progress {
  version: 2;
  memories: Record<string, Memory>;
  attempts: Attempt[];
  sessions: SessionSummary[];
  settings: Settings;
  garden: Garden;
  favorites: string[];
}
export const emptyProgress = (): Progress => ({
  version: 2,
  memories: {},
  attempts: [],
  sessions: [],
  settings: { sound: true, voiceURI: "", inputMode: "typing" },
  garden: newGarden(),
  favorites: [],
});
export const memoryKey = (itemId: string, direction: Direction) =>
  `${itemId}:${direction}`;
export const normalize = (text: string) =>
  text
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[’‘]/g, "'");
export const isCorrectReading = (item: Kana, answer: string) =>
  [item.reading, ...item.aliases].some(
    (value) => normalize(value) === normalize(answer),
  );
export function shuffle<T>(values: T[], random = Math.random): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const intervals = [
  5 * 60_000,
  24 * 3600_000,
  3 * 86400_000,
  7 * 86400_000,
  14 * 86400_000,
  30 * 86400_000,
];
export function updateMemory(
  previous: Memory | undefined,
  attempt: Attempt,
): Memory {
  const memory: Memory = previous
    ? { ...previous, confusions: { ...previous.confusions } }
    : {
        key: memoryKey(attempt.itemId, attempt.direction),
        itemId: attempt.itemId,
        direction: attempt.direction,
        attempts: 0,
        correct: 0,
        stage: 0,
        lastSeen: 0,
        lastPromotion: 0,
        due: 0,
        confusions: {},
      };
  const fluent = attempt.correct && !attempt.hinted && !attempt.slow;
  if (!attempt.correct || attempt.hinted) memory.stage = 0;
  else if (
    fluent &&
    (!memory.lastPromotion || attempt.at - memory.lastPromotion >= 6 * 3600_000)
  ) {
    memory.stage = Math.min(5, memory.stage + 1);
    memory.lastPromotion = attempt.at;
  }
  memory.attempts++;
  if (attempt.correct) memory.correct++;
  else if (attempt.answer)
    memory.confusions[attempt.answer] =
      (memory.confusions[attempt.answer] || 0) + 1;
  memory.lastSeen = attempt.at;
  memory.due = attempt.at + (fluent ? intervals[memory.stage] : intervals[0]);
  return memory;
}
export function applyAttempt(progress: Progress, attempt: Attempt): Progress {
  const key = memoryKey(attempt.itemId, attempt.direction);
  return {
    ...progress,
    memories: {
      ...progress.memories,
      [key]: updateMemory(progress.memories[key], attempt),
    },
    attempts: [...progress.attempts, attempt].slice(-20_000),
  };
}
export function localDay(at: number): string {
  const date = new Date(at);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function streakDays(attempts: Attempt[], now = Date.now()): number {
  const days = new Set(attempts.map((a) => localDay(a.at)));
  const cursor = new Date(now);
  if (!days.has(localDay(cursor.getTime())))
    cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDay(cursor.getTime()))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
export function longestStreakDays(attempts: Attempt[]): number {
  const days = [...new Set(attempts.map((a) => localDay(a.at)))].sort();
  let longest = 0;
  let current = 0;
  let previous = "";
  for (const day of days) {
    const yesterday = new Date(day + "T12:00:00");
    yesterday.setDate(yesterday.getDate() - 1);
    current = localDay(yesterday.getTime()) === previous ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}
export function chapterStats(id: ChapterId, progress: Progress) {
  const ids =
    id === "rhythm" || id === "pitch"
      ? conceptsForChapter(id).map((i) => i.id)
      : kanaForChapter(id).map((i) => i.id);
  const direction = id === "rhythm" || id === "pitch" ? "concept" : "read";
  const memories = ids
    .map((itemId) => progress.memories[memoryKey(itemId, direction)])
    .filter(Boolean);
  return {
    total: ids.length,
    seen: memories.length,
    mastered: memories.filter((m) => m.stage >= 3).length,
  };
}

export interface Question {
  id: string;
  itemId: string;
  direction: Direction;
  kana?: Kana;
  concept?: Concept;
  entry?: StudyEntry;
  options: string[];
  expected: string;
}
export function makeKanaQuestion(
  item: Kana,
  direction: "read" | "listen",
  random = Math.random,
): Question {
  const sound = (reading: string) => (reading === "wo" ? "o" : reading);
  const pool = kana.filter(
    (other) =>
      other.script === item.script &&
      other.kind === item.kind &&
      (direction === "listen"
        ? sound(other.reading) !== sound(item.reading)
        : other.reading !== item.reading),
  );
  const expected = direction === "read" ? item.reading : item.glyph;
  // Homophones never compete in listening questions.
  const distinctPool = [
    ...new Map(
      shuffle(pool, random).map((other) => [
        direction === "listen" ? sound(other.reading) : other.reading,
        other,
      ]),
    ).values(),
  ];
  const alternatives = distinctPool.map((other) =>
    direction === "read" ? other.reading : other.glyph,
  );
  const unique = [...new Set(alternatives)]
    .filter((value) => value !== expected)
    .slice(0, 3);
  return {
    id: crypto.randomUUID(),
    itemId: item.id,
    kana: item,
    direction,
    expected,
    options: shuffle([expected, ...unique], random),
  };
}
export function makeConceptQuestion(item: Concept): Question {
  return {
    id: crypto.randomUUID(),
    itemId: item.id,
    direction: "concept",
    concept: item,
    expected: item.answer,
    options: shuffle(item.options),
  };
}
export const entryDirection = (
  entry: StudyEntry,
  requested: Direction = "read",
): Direction =>
  entry.options
    ? "concept"
    : requested === "meaning" || entry.kind === "phrase"
      ? "meaning"
      : "read";

export function makeEntryQuestion(
  entry: StudyEntry,
  requested: Direction = "read",
): Question {
  const direction = entryDirection(entry, requested);
  const expected =
    direction === "concept"
      ? entry.answer!
      : direction === "read"
        ? entry.reading
        : entry.meaning;
  let options: string[];
  if (direction === "concept") options = shuffle(entry.options!);
  else {
    const sameLesson = entriesForLesson(entry.lessonId).filter(
      (e) => e.id !== entry.id && !e.options,
    );
    const others = studyEntries.filter(
      (e) => e.id !== entry.id && e.kind === entry.kind && !e.options,
    );
    const alternatives = [
      ...new Set(
        [...shuffle(sameLesson), ...shuffle(others)].map((e) =>
          direction === "read" ? e.reading : e.meaning,
        ),
      ),
    ]
      .filter(
        (value) =>
          value &&
          value !== expected &&
          (direction !== "read" || !isCorrectEntryReading(entry, value)),
      )
      .slice(0, 3);
    options = shuffle([expected, ...alternatives]);
  }
  return {
    id: crypto.randomUUID(),
    itemId: entry.id,
    entry,
    direction,
    expected,
    options,
  };
}

function studySession(
  lessonId: string,
  progress: Progress,
  requested: Direction,
  now: number,
): Question[] {
  const candidates = entriesForLesson(lessonId);
  if (!candidates.length) return [];
  const memory = (entry: StudyEntry) =>
    progress.memories[memoryKey(entry.id, entryDirection(entry, requested))];
  const due = candidates.filter((e) => memory(e)?.due <= now);
  const unseen = candidates
    .filter((e) => !memory(e))
    .slice(0, candidates[0].options ? 6 : 5);
  const learning = candidates.filter((e) => memory(e) && memory(e).stage < 3);
  const selected = [
    ...new Map(
      [...shuffle(due), ...unseen, ...shuffle(learning)].map((e) => [e.id, e]),
    ).values(),
  ].slice(0, 8);
  if (!selected.length) selected.push(...shuffle(candidates).slice(0, 8));
  const count = Math.min(12, Math.max(6, candidates.length));
  const result: StudyEntry[] = [];
  while (result.length < count) {
    const round = shuffle(selected);
    if (result.length && round.length > 1 && round[0].id === result.at(-1)?.id)
      [round[0], round[1]] = [round[1], round[0]];
    result.push(...round.slice(0, count - result.length));
  }
  return result.map((e) => makeEntryQuestion(e, requested));
}
export function buildSession(
  chapter: SessionCourseId,
  progress: Progress,
  direction: "read" | "listen" | "meaning" = "read",
  now = Date.now(),
): Question[] {
  if (lessonById.has(chapter as LessonId))
    return studySession(chapter, progress, direction, now);
  if (chapter === "rhythm" || chapter === "pitch")
    return shuffle(conceptsForChapter(chapter)).map(makeConceptQuestion);
  if (chapter === "review") {
    const due = Object.values(progress.memories)
      .filter((m) => m.due <= now)
      .sort((a, b) => a.due - b.due)
      .slice(0, 12);
    return due.flatMap((memory) => {
      const entry = entryById.get(memory.itemId);
      if (entry) return [makeEntryQuestion(entry, memory.direction)];
      if (memory.direction === "concept") {
        const concept = [
          ...conceptsForChapter("rhythm"),
          ...conceptsForChapter("pitch"),
        ].find((c) => c.id === memory.itemId);
        return concept ? [makeConceptQuestion(concept)] : [];
      }
      const item = kanaById.get(memory.itemId);
      return item &&
        (memory.direction === "read" || memory.direction === "listen")
        ? [makeKanaQuestion(item, memory.direction)]
        : [];
    });
  }
  const candidates =
    chapter === "daily"
      ? [
          ...kanaForChapter("voiced"),
          ...kanaForChapter("katakana").filter((k) => k.kind === "basic"),
        ]
      : kanaForChapter(chapter as ChapterId);
  if (!candidates.length) return [];
  const due = candidates.filter((item) => {
    const memory = progress.memories[memoryKey(item.id, direction)];
    return memory && memory.due <= now;
  });
  const unseen = candidates.filter(
    (item) => !progress.memories[memoryKey(item.id, direction)],
  );
  const learning = candidates.filter(
    (item) => progress.memories[memoryKey(item.id, direction)]?.stage < 3,
  );
  // New learners get a small, coherent set, rather than 12 unrelated unfamiliar symbols.
  const newSet =
    chapter === "daily"
      ? [
          ...unseen.filter((k) => k.script === "hiragana").slice(0, 3),
          ...unseen.filter((k) => k.script === "katakana").slice(0, 3),
        ]
      : unseen.slice(0, 5);
  const chosen = [
    ...new Map(
      [...shuffle(due), ...newSet, ...shuffle(learning)].map((item) => [
        item.id,
        item,
      ]),
    ).values(),
  ].slice(0, 8);
  if (!chosen.length) chosen.push(...shuffle(candidates).slice(0, 8));
  const result: Kana[] = [];
  while (result.length < 12) {
    const round = shuffle(chosen);
    if (result.length && round.length > 1 && round[0].id === result.at(-1)?.id)
      [round[0], round[1]] = [round[1], round[0]];
    result.push(...round.slice(0, 12 - result.length));
  }
  return result.map((item) =>
    makeKanaQuestion(item, direction === "listen" ? "listen" : "read"),
  );
}

export function validateProgress(value: unknown): Progress {
  if (!value || typeof value !== "object")
    throw new Error("这不是有效的小岛进度文件。");
  const p = value as Omit<Progress, "version"> & { version: number };
  if (
    (p.version !== 1 && p.version !== 2) ||
    !p.memories ||
    typeof p.memories !== "object" ||
    Array.isArray(p.memories) ||
    !Array.isArray(p.attempts) ||
    !Array.isArray(p.sessions)
  )
    throw new Error("进度格式不兼容，请选择由本游戏导出的 JSON 文件。");
  if (
    p.attempts.length > 20_000 ||
    p.sessions.length > 10_000 ||
    Object.keys(p.memories).length > 20_000
  )
    throw new Error("进度文件超出支持的大小。");
  const finite = (x: unknown): x is number =>
    typeof x === "number" && Number.isFinite(x) && x >= 0;
  const validId = (id: string, direction: Direction) => {
    const entry = entryById.get(id);
    if (entry)
      return entry.options
        ? direction === "concept"
        : direction === "read" || direction === "meaning";
    return direction === "concept"
      ? [...conceptsForChapter("rhythm"), ...conceptsForChapter("pitch")].some(
          (c) => c.id === id,
        )
      : (direction === "read" || direction === "listen") && kanaById.has(id);
  };
  for (const [key, m] of Object.entries(p.memories)) {
    if (
      !m ||
      !validId(m.itemId, m.direction) ||
      key !== memoryKey(m.itemId, m.direction) ||
      m.key !== key ||
      !Number.isInteger(m.stage) ||
      m.stage < 0 ||
      m.stage > 5 ||
      ![m.attempts, m.correct, m.lastSeen, m.lastPromotion, m.due].every(
        finite,
      ) ||
      m.correct > m.attempts ||
      !m.confusions ||
      typeof m.confusions !== "object" ||
      Array.isArray(m.confusions) ||
      !Object.values(m.confusions).every(finite)
    )
      throw new Error("进度文件中的记忆记录无效。");
  }
  const ids = new Set<string>();
  for (const a of p.attempts) {
    if (
      !a ||
      typeof a.id !== "string" ||
      ids.has(a.id) ||
      typeof a.sessionId !== "string" ||
      !validId(a.itemId, a.direction) ||
      typeof a.answer !== "string" ||
      typeof a.correct !== "boolean" ||
      typeof a.hinted !== "boolean" ||
      typeof a.slow !== "boolean" ||
      !finite(a.elapsed) ||
      !finite(a.at)
    )
      throw new Error("进度文件中的答题记录无效。");
    ids.add(a.id);
  }
  const validChapters = [
    "hiragana",
    "voiced",
    "katakana",
    "yoon",
    "rhythm",
    "pitch",
    "daily",
    "review",
    ...lessons.map((l) => l.id),
  ];
  const sessionIds = new Set<string>();
  for (const s of p.sessions) {
    if (
      !s ||
      typeof s.id !== "string" ||
      sessionIds.has(s.id) ||
      !validChapters.includes(s.chapter) ||
      !finite(s.at) ||
      typeof s.completed !== "boolean" ||
      !Number.isInteger(s.count) ||
      s.count < 0 ||
      !Number.isInteger(s.correct) ||
      s.correct < 0 ||
      s.correct > s.count ||
      (s.reward !== undefined &&
        (!Number.isInteger(s.reward) || s.reward < 0 || s.reward > 60))
    )
      throw new Error("进度文件中的关卡记录无效。");
    sessionIds.add(s.id);
  }
  const garden =
    p.version === 1
      ? {
          ...newGarden(),
          earned: p.sessions.filter((s) => s.completed).length * 5,
        }
      : p.garden;
  if (
    !garden ||
    !Number.isSafeInteger(garden.earned) ||
    garden.earned < 0 ||
    garden.earned > 10_000_000 ||
    !Array.isArray(garden.owned) ||
    !garden.owned.includes("seedling") ||
    new Set(garden.owned).size !== garden.owned.length ||
    garden.owned.some((id) => !decorationById.has(id)) ||
    !garden.placements ||
    typeof garden.placements !== "object" ||
    !Array.isArray(garden.stamps) ||
    new Set(garden.stamps).size !== garden.stamps.length ||
    garden.stamps.some(
      (id) => !validChapters.includes(id) || id === "daily" || id === "review",
    )
  )
    throw new Error("进度文件中的收藏记录无效。");
  const placed = gardenSlots
    .map((s) => garden.placements[s.id])
    .filter((v) => v !== null);
  if (
    placed.some((id) => typeof id !== "string" || !garden.owned.includes(id)) ||
    new Set(placed).size !== placed.length ||
    garden.owned.reduce(
      (sum, id) => sum + (decorationById.get(id)?.cost || 0),
      0,
    ) > garden.earned
  )
    throw new Error("进度文件中的装饰摆放或贝壳余额无效。");
  const favorites = p.version === 1 ? [] : p.favorites;
  if (
    !Array.isArray(favorites) ||
    favorites.length > studyEntries.length ||
    new Set(favorites).size !== favorites.length ||
    favorites.some((id) => !entryById.has(id))
  )
    throw new Error("进度文件中的收藏词条无效。");
  return {
    version: 2,
    memories: p.memories,
    attempts: p.attempts,
    sessions: p.sessions,
    garden,
    favorites,
    settings: {
      sound: p.settings?.sound !== false,
      voiceURI:
        typeof p.settings?.voiceURI === "string" ? p.settings.voiceURI : "",
      inputMode: p.settings?.inputMode === "choice" ? "choice" : "typing",
    },
  };
}
