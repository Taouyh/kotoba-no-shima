import { describe, expect, it } from "vitest";
import {
  studyEntries,
  entryById,
  entriesForLesson,
  lessons,
  resources,
  resourceById,
} from "../data/catalog";
import { newGarden } from "../data/game";
import {
  emptyProgress,
  validateProgress,
  buildSession,
  makeEntryQuestion,
  updateMemory,
  memoryKey,
  type Attempt,
  type Progress,
  type SessionSummary,
} from "./learning";
import {
  buyDecoration,
  completeSession,
  courseStats,
  lessonUnlocked,
  placeDecoration,
  shellBalance,
  toggleFavorite,
} from "./game";
import { isCorrectEntryReading, romanize } from "./reading";

const at = new Date(2026, 9, 24, 12).getTime();
const summary = (overrides: Partial<SessionSummary> = {}): SessionSummary => ({
  id: "session-1",
  chapter: "n4-kanji-time",
  at,
  completed: true,
  count: 12,
  correct: 12,
  ...overrides,
});
const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  id: "a-1",
  sessionId: "session-1",
  itemId: "kanji-日",
  direction: "read",
  answer: "まいにち",
  correct: true,
  hinted: false,
  slow: false,
  elapsed: 2000,
  at,
  ...overrides,
});
const legacy = () => ({
  version: 1,
  memories: {},
  attempts: [],
  sessions: [summary({ chapter: "voiced" })],
  settings: { sound: true, voiceURI: "", inputMode: "typing" },
});

describe("expanded course data", () => {
  it("provides substantial N4 and care packs with unique stable identities", () => {
    expect(studyEntries.length).toBe(1332);
    expect(studyEntries.filter((e) => e.kind === "kanji")).toHaveLength(314);
    expect(
      studyEntries.filter((e) => e.lessonId.startsWith("n4-")),
    ).toHaveLength(1094);
    expect(
      studyEntries.filter((e) => e.lessonId.startsWith("care-")),
    ).toHaveLength(238);
    expect(new Set(studyEntries.map((e) => e.id)).size).toBe(
      studyEntries.length,
    );
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
  });
  it("has no empty lessons, broken prerequisites, missing source references or cyclic unlocks", () => {
    for (const lesson of lessons) {
      expect(entriesForLesson(lesson.id).length).toBeGreaterThanOrEqual(6);
      const visited = new Set<string>([lesson.id]);
      let id = lesson.prerequisite;
      while (id) {
        expect(visited.has(id)).toBe(false);
        visited.add(id);
        const parent = lessons.find((l) => l.id === id)!;
        expect(parent?.track).toBe(lesson.track);
        id = parent.prerequisite;
      }
    }
    for (const entry of studyEntries) {
      expect(entry.term).toBeTruthy();
      expect(entry.meaning).toBeTruthy();
      expect(lessons.some((l) => l.id === entry.lessonId)).toBe(true);
      for (const id of entry.sourceIds) expect(resourceById.has(id)).toBe(true);
      if (!entry.options) expect(entry.reading).toMatch(/[ぁ-んー]/);
      else {
        expect(entry.options).toHaveLength(4);
        expect(new Set(entry.options).size).toBe(4);
        expect(entry.options).toContain(entry.answer);
        expect(entry.example).toBeTruthy();
      }
    }
    for (const source of resources)
      expect(new URL(source.url).protocol).toBe("https:");
  });
  it("creates answerable reading and meaning questions for every word, phrase and concept", () => {
    for (const entry of studyEntries)
      for (const mode of ["read", "meaning"] as const) {
        const q = makeEntryQuestion(entry, mode);
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4);
        expect(q.options).toContain(q.expected);
        expect(q.itemId).toBe(entry.id);
        if (q.direction === "read")
          expect(
            q.options.filter((value) => isCorrectEntryReading(entry, value)),
          ).toHaveLength(1);
      }
  });
  it("teaches kanji through words instead of assigning a single universal reading", () => {
    const entry = entryById.get("kanji-日")!;
    expect(entry.term).toBe("毎日");
    expect(makeEntryQuestion(entry).expected).toBe("まいにち");
    expect(isCorrectEntryReading(entry, "mainichi")).toBe(true);
    expect(isCorrectEntryReading(entry, "マイニチ")).toBe(true);
    expect(isCorrectEntryReading(entry, "にち")).toBe(false);
    expect(
      isCorrectEntryReading(entryById.get("word-毎年-まいとし")!, "まいねん"),
    ).toBe(true);
    expect(isCorrectEntryReading(entryById.get("kanji-分")!, "じっぷん")).toBe(
      true,
    );
    expect(
      isCorrectEntryReading(entryById.get("word-十分-じゅうぶん")!, "じっぷん"),
    ).toBe(false);
  });
  it("handles common combinations, small tsu and katakana long vowels", () => {
    expect(romanize("がっこう")).toBe("gakkou");
    expect(romanize("しゅっぱつ")).toBe("shuppatsu");
    expect(romanize("コーヒー")).toBe("koohii");
    expect(romanize("フォーク")).toBe("fooku");
    expect(romanize("マッチ")).toBe("matchi");
    expect(
      isCorrectEntryReading(entryById.get("care-word-看護師")!, "kangosi"),
    ).toBe(true);
  });
});

describe("course scheduling and progress isolation", () => {
  it("limits new words, keeps requested directions separate and reviews the original direction", () => {
    const p = emptyProgress();
    const q = buildSession("n4-kanji-time", p);
    expect(q).toHaveLength(12);
    expect(new Set(q.map((x) => x.itemId)).size).toBe(5);
    const m = updateMemory(
      undefined,
      attempt({ direction: "meaning", answer: "每天" }),
    );
    p.memories[m.key] = m;
    expect(p.memories[memoryKey(m.itemId, "read")]).toBeUndefined();
    const review = buildSession("review", p, "read", m.due);
    expect(review[0].direction).toBe("meaning");
    expect(review[0].entry?.id).toBe("kanji-日");
  });
  it("uses concept questions for grammar, documents and care scenarios", () => {
    for (const id of [
      "n4-grammar-basic",
      "n4-reading-daily",
      "care-documents",
      "care-principles",
    ] as const) {
      const questions = buildSession(id, emptyProgress());
      expect(questions.length).toBeGreaterThanOrEqual(6);
      expect(
        questions.every((q) => q.direction === "concept" && q.entry?.options),
      ).toBe(true);
    }
  });
  it("returns safely for unknown course identifiers", () => {
    expect(buildSession("n4-does-not-exist", emptyProgress())).toEqual([]);
  });
});

describe("map stars, rewards and decoration inventory", () => {
  it("unlocks the next stop only after a qualifying completed run", () => {
    const p = emptyProgress();
    expect(lessonUnlocked("n4-kanji-time", p)).toBe(true);
    expect(lessonUnlocked("n4-kanji-people", p)).toBe(false);
    expect(lessonUnlocked("care-principles", p)).toBe(true);
    const failed = completeSession(p, summary({ correct: 7 })).progress;
    expect(courseStats("n4-kanji-time", failed).stars).toBe(0);
    const passed = completeSession(p, summary({ correct: 8 }));
    expect(courseStats("n4-kanji-time", passed.progress).stars).toBe(1);
    expect(lessonUnlocked("n4-kanji-people", passed.progress)).toBe(true);
    expect(lessonUnlocked("n4-kanji-town", passed.progress)).toBe(false);
    expect(passed.progress.garden.stamps).toContain("n4-kanji-time");
  });
  it("awards exactly once, enforces the daily cap and never rewards unfinished sessions", () => {
    let p = completeSession(emptyProgress(), summary()).progress;
    expect(p.garden.earned).toBe(17);
    expect(completeSession(p, summary()).reward).toBe(0);
    expect(
      completeSession(p, summary({ id: "partial", completed: false })).reward,
    ).toBe(0);
    for (let i = 2; i < 8; i++)
      p = completeSession(p, summary({ id: `session-${i}` })).progress;
    expect(p.garden.earned).toBe(60);
    const nextDay = completeSession(
      p,
      summary({ id: "next-day", at: at + 86400_000 }),
    );
    expect(nextDay.reward).toBe(17);
    expect(nextDay.progress.garden.earned).toBe(77);
  });
  it("spends earned shells and moves one owned decoration between slots", () => {
    let p = completeSession(emptyProgress(), summary()).progress;
    p = buyDecoration(p, "flower");
    expect(shellBalance(p)).toBe(9);
    expect(() => buyDecoration(p, "flower")).toThrow();
    expect(() => buyDecoration(p, "lighthouse")).toThrow();
    expect(() => placeDecoration(p, "garden", "cat")).toThrow();
    p = placeDecoration(p, "garden", "flower");
    p = placeDecoration(p, "porch", "flower");
    expect(p.garden.placements.garden).toBeNull();
    expect(p.garden.placements.porch).toBe("flower");
    p = placeDecoration(p, "porch", null);
    expect(p.garden.owned).toContain("flower");
    expect(p.garden.placements.porch).toBeNull();
  });
  it("does not count reading and meaning as two distinct entries for coverage stars", () => {
    let p = completeSession(emptyProgress(), summary()).progress;
    for (const e of entriesForLesson("n4-kanji-time").slice(0, 20))
      for (const direction of ["read", "meaning"] as const) {
        const m = updateMemory(undefined, attempt({ itemId: e.id, direction }));
        p.memories[m.key] = m;
      }
    expect(courseStats("n4-kanji-time", p).seen).toBe(20);
    expect(courseStats("n4-kanji-time", p).stars).toBe(1);
  });
});

describe("versioned backups and migration", () => {
  it("migrates v1 without losing kana records and only grants the migration gift once", () => {
    const old = legacy();
    const a = attempt({ itemId: "h-が", answer: "ga" });
    const m = updateMemory(undefined, a);
    const populated = { ...old, memories: { [m.key]: m }, attempts: [a] };
    const p = validateProgress(populated);
    expect(p.version).toBe(2);
    expect(p.memories[m.key]).toEqual(m);
    expect(p.attempts).toEqual([a]);
    expect(p.garden.earned).toBe(5);
    expect(validateProgress(JSON.parse(JSON.stringify(p))).garden.earned).toBe(
      5,
    );
    expect(populated.version).toBe(1);
  });
  it("round trips the new inventory, placements and favorites", () => {
    let p = completeSession(emptyProgress(), summary()).progress;
    p = placeDecoration(buyDecoration(p, "flower"), "porch", "flower");
    p = toggleFavorite(p, "kanji-日");
    expect(validateProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(toggleFavorite(p, "kanji-日").favorites).toEqual([]);
  });
  it("rejects invalid inventory, negative balances, unknown favorites and duplicate session claims", () => {
    const p = emptyProgress();
    const check = (garden: Progress["garden"]) =>
      expect(() => validateProgress({ ...p, garden })).toThrow();
    check({ ...newGarden(), owned: ["seedling", "flower"] });
    check({ ...newGarden(), owned: ["seedling", "seedling"] });
    check({ ...newGarden(), earned: -1 });
    check({
      ...newGarden(),
      placements: { ...newGarden().placements, porch: "seedling" },
    });
    check({ ...newGarden(), stamps: ["unknown-course"] });
    expect(() =>
      validateProgress({ ...p, favorites: ["nonexistent-word"] }),
    ).toThrow();
    expect(() =>
      validateProgress({ ...p, sessions: [summary(), summary()] }),
    ).toThrow();
  });
});
