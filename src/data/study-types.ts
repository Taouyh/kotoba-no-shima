export type TrackId = "n4" | "care";
export type EntryKind =
  "kanji" | "word" | "phrase" | "grammar" | "reading" | "scenario";
export type LessonId = `n4-${string}` | `care-${string}`;
export interface Lesson {
  id: LessonId;
  track: TrackId;
  title: string;
  subtitle: string;
  group: string;
  glyph: string;
  color: string;
  prerequisite?: LessonId;
  description: string;
}
export interface StudyEntry {
  id: string;
  lessonId: LessonId;
  kind: EntryKind;
  term: string;
  reading: string;
  readingAliases?: string[];
  meaning: string;
  character?: string;
  example?: string;
  translation?: string;
  note?: string;
  prompt?: string;
  options?: string[];
  answer?: string;
  sourceIds: string[];
}
export interface Resource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  description: string;
  checked: string;
  category: "n4" | "care";
}
