import { kanjiEntries } from "./kanji";
import { wordEntries } from "./words";
import { phraseEntries } from "./phrases";
import { grammarEntries } from "./grammar";
import { readingEntries } from "./reading";
import { careEntries } from "./care";
import type { StudyEntry } from "./study-types";
export { lessons, lessonById } from "./lessons";
export { resources, resourceById } from "./sources";
export type {
  StudyEntry,
  LessonId,
  EntryKind,
  TrackId,
  Lesson,
} from "./study-types";

const readingVariants: Record<string, string[]> = {
  毎年: ["まいねん", "まいとし"],
  毎月: ["まいげつ", "まいつき"],
  良い: ["いい", "よい"],
};
export const studyEntries: StudyEntry[] = [
  ...kanjiEntries,
  ...wordEntries,
  ...phraseEntries,
  ...grammarEntries,
  ...readingEntries,
  ...careEntries,
].map((entry) => ({
  ...entry,
  readingAliases:
    entry.term === "十分" && entry.reading === "じゅっぷん"
      ? ["じっぷん"]
      : readingVariants[entry.term]?.filter(
          (reading) => reading !== entry.reading,
        ),
}));
export const entryById = new Map(
  studyEntries.map((entry) => [entry.id, entry]),
);
export const entriesForLesson = (lessonId: string) =>
  studyEntries.filter((entry) => entry.lessonId === lessonId);
export const kindLabels = {
  kanji: "汉字",
  word: "词汇",
  phrase: "交流短语",
  grammar: "语法",
  reading: "阅读",
  scenario: "介护概念",
};
