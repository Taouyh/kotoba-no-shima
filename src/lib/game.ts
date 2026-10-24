import {
  chapters,
  kanaForChapter,
  conceptsForChapter,
} from "../data/curriculum";
import {
  entriesForLesson,
  entryById,
  lessonById,
  lessons,
  type LessonId,
} from "../data/catalog";
import { decorationById, gardenSlots, type GardenSlot } from "../data/game";
import {
  localDay,
  type CourseId,
  type Progress,
  type SessionSummary,
} from "./learning";

export function courseStats(id: CourseId, progress: Progress) {
  const lesson = lessonById.get(id as LessonId);
  const ids = lesson
    ? entriesForLesson(id).map((e) => e.id)
    : id === "rhythm" || id === "pitch"
      ? conceptsForChapter(id).map((e) => e.id)
      : kanaForChapter(id as Parameters<typeof kanaForChapter>[0]).map(
          (e) => e.id,
        );
  const included = new Set(ids);
  const memories = Object.values(progress.memories).filter((m) =>
    included.has(m.itemId),
  );
  const seen = new Set(memories.map((m) => m.itemId)).size;
  const mastered = new Set(
    memories.filter((m) => m.stage >= 3).map((m) => m.itemId),
  ).size;
  const firstStar = progress.sessions.some(
    (s) =>
      s.chapter === id &&
      s.completed &&
      s.count >= Math.min(6, ids.length) &&
      s.correct / s.count >= 0.6,
  );
  const stars = !firstStar
    ? 0
    : mastered / ids.length >= 0.6
      ? 3
      : seen / ids.length >= 0.6
        ? 2
        : 1;
  return { total: ids.length, seen, mastered, stars, firstStar };
}
export function lessonUnlocked(id: LessonId, progress: Progress) {
  const lesson = lessonById.get(id);
  return (
    !!lesson &&
    (!lesson.prerequisite ||
      courseStats(lesson.prerequisite, progress).stars > 0)
  );
}
export const shellBalance = (progress: Progress) =>
  progress.garden.earned -
  progress.garden.owned.reduce(
    (sum, id) => sum + (decorationById.get(id)?.cost || 0),
    0,
  );
export function completeSession(
  progress: Progress,
  summary: SessionSummary,
): { progress: Progress; reward: number; stamp: boolean } {
  if (
    !summary.completed ||
    !Number.isInteger(summary.count) ||
    !Number.isInteger(summary.correct) ||
    summary.correct < 0 ||
    summary.correct > summary.count
  )
    return { progress, reward: 0, stamp: false };
  if (progress.sessions.some((s) => s.id === summary.id && s.completed))
    return { progress, reward: 0, stamp: false };
  const earnedToday = progress.sessions
    .filter((s) => localDay(s.at) === localDay(summary.at))
    .reduce((sum, s) => sum + (s.reward || 0), 0);
  const reward =
    summary.count >= 6
      ? Math.max(
          0,
          Math.min(60 - earnedToday, 5 + Math.min(12, summary.correct)),
        )
      : 0;
  let next: Progress = {
    ...progress,
    sessions: [
      ...progress.sessions.filter((s) => s.id !== summary.id),
      { ...summary, reward },
    ].slice(-10_000),
    garden: { ...progress.garden, earned: progress.garden.earned + reward },
  };
  const course = [
    ...chapters.map((c) => c.id),
    ...lessons.map((l) => l.id),
  ].find((id) => id === summary.chapter);
  const stamp =
    !!course &&
    courseStats(course, next).stars > 0 &&
    !next.garden.stamps.includes(course);
  if (stamp)
    next = {
      ...next,
      garden: { ...next.garden, stamps: [...next.garden.stamps, course!] },
    };
  return { progress: next, reward, stamp };
}
export function buyDecoration(progress: Progress, id: string): Progress {
  const decoration = decorationById.get(id);
  if (!decoration) throw new Error("没有找到这件小岛装饰。");
  if (progress.garden.owned.includes(id))
    throw new Error("你已经拥有这件装饰。");
  if (shellBalance(progress) < decoration.cost)
    throw new Error("贝壳还不够，再完成几轮练习吧。");
  return {
    ...progress,
    garden: { ...progress.garden, owned: [...progress.garden.owned, id] },
  };
}
export function placeDecoration(
  progress: Progress,
  slot: GardenSlot,
  id: string | null,
): Progress {
  if (
    !gardenSlots.some((s) => s.id === slot) ||
    (id && !progress.garden.owned.includes(id))
  )
    throw new Error("只能摆放已经拥有的装饰。");
  const placements = { ...progress.garden.placements };
  if (id)
    for (const s of gardenSlots)
      if (placements[s.id] === id) placements[s.id] = null;
  placements[slot] = id;
  return { ...progress, garden: { ...progress.garden, placements } };
}
export function toggleFavorite(progress: Progress, id: string): Progress {
  if (!entryById.has(id)) return progress;
  return {
    ...progress,
    favorites: progress.favorites.includes(id)
      ? progress.favorites.filter((value) => value !== id)
      : [...progress.favorites, id],
  };
}
