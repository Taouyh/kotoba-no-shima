import { describe, expect, it } from "vitest";
import { kana, kanaById, kanaForChapter, concepts } from "../data/curriculum";
import {
  buildSession,
  emptyProgress,
  isCorrectReading,
  makeKanaQuestion,
  memoryKey,
  updateMemory,
  validateProgress,
  type Attempt,
} from "./learning";

const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  id: "a1",
  sessionId: "s1",
  itemId: "h-が",
  direction: "read",
  answer: "ga",
  correct: true,
  hinted: false,
  slow: false,
  elapsed: 1500,
  at: 1_800_000_000_000,
  ...overrides,
});
describe("curriculum integrity", () => {
  it("covers both scripts with unique identities and no duplicate distractors", () => {
    expect(new Set(kana.map((k) => k.id)).size).toBe(kana.length);
    expect(kanaForChapter("hiragana")).toHaveLength(46);
    expect(kanaForChapter("voiced")).toHaveLength(25);
    expect(kanaForChapter("katakana")).toHaveLength(71);
    for (const item of kana) {
      expect(isCorrectReading(item, item.reading)).toBe(true);
      const q = makeKanaQuestion(item, "read");
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.expected);
    }
    expect(new Set(concepts.map((c) => c.id)).size).toBe(concepts.length);
    for (const concept of concepts)
      expect(concept.options).toContain(concept.answer);
  });
  it("accepts pronunciation and IME spellings, including common homophones", () => {
    expect(isCorrectReading(kanaById.get("h-し")!, " SI ")).toBe(true);
    expect(isCorrectReading(kanaById.get("h-ぢ")!, "ji")).toBe(true);
    expect(isCorrectReading(kanaById.get("h-ぢ")!, "di")).toBe(true);
    expect(isCorrectReading(kanaById.get("h-づ")!, "du")).toBe(true);
    expect(isCorrectReading(kanaById.get("k-ヲ")!, "o")).toBe(true);
    expect(isCorrectReading(kanaById.get("h-が")!, "ka")).toBe(false);
  });
  it("never pits normally homophonous kana against one another in listening", () => {
    for (let run = 0; run < 25; run++)
      for (const id of ["h-じ", "h-ぢ", "h-ず", "h-づ", "h-お", "h-を"]) {
        const item = kanaById.get(id)!;
        const q = makeKanaQuestion(item, "listen");
        const answers = q.options.map((glyph) =>
          kana.find((k) => k.script === item.script && k.glyph === glyph)!,
        );
        const audible = answers.map((k) =>
          k.reading === "wo" ? "o" : k.reading,
        );
        expect(new Set(audible).size).toBe(audible.length);
      }
  });
});
describe("spaced review", () => {
  it("does not let a same-day grind create mastery", () => {
    let memory = updateMemory(undefined, attempt());
    for (let i = 1; i < 20; i++)
      memory = updateMemory(
        memory,
        attempt({ id: `a${i}`, at: attempt().at + i * 1000 }),
      );
    expect(memory.stage).toBe(1);
    expect(memory.attempts).toBe(20);
    memory = updateMemory(memory, attempt({ at: attempt().at + 86400_000 }));
    expect(memory.stage).toBe(2);
    memory = updateMemory(
      memory,
      attempt({ at: attempt().at + 4 * 86400_000 }),
    );
    expect(memory.stage).toBe(3);
  });
  it("reschedules hints and mistakes in five minutes without promoting slow answers", () => {
    const first = updateMemory(undefined, attempt());
    const hinted = updateMemory(first, attempt({ hinted: true }));
    expect(hinted.stage).toBe(0);
    expect(hinted.due - hinted.lastSeen).toBe(300_000);
    const wrong = updateMemory(
      first,
      attempt({ correct: false, answer: "ka" }),
    );
    expect(wrong.confusions.ka).toBe(1);
    expect(wrong.stage).toBe(0);
    expect(updateMemory(undefined, attempt({ slow: true })).stage).toBe(0);
  });
  it("keeps script and exercise direction separate", () => {
    const p = emptyProgress();
    p.memories[memoryKey("h-が", "read")] = updateMemory(undefined, attempt());
    expect(p.memories[memoryKey("k-ガ", "read")]).toBeUndefined();
    expect(p.memories[memoryKey("h-が", "listen")]).toBeUndefined();
  });
  it("starts daily sessions with a bounded new set and interleaves repeated symbols", () => {
    const session = buildSession("daily", emptyProgress());
    expect(session).toHaveLength(12);
    expect(new Set(session.map((q) => q.itemId)).size).toBeLessThanOrEqual(6);
    expect(session.some((q) => q.kana?.script === "katakana")).toBe(true);
    expect(session.some((q) => q.kana?.kind === "voiced")).toBe(true);
    for (let i = 1; i < session.length; i++)
      expect(session[i].itemId).not.toBe(session[i - 1].itemId);
  });
  it("only selects due records during due review", () => {
    const p = emptyProgress();
    const m = updateMemory(undefined, attempt());
    p.memories[m.key] = m;
    expect(buildSession("review", p, "read", m.due - 1)).toHaveLength(0);
    expect(buildSession("review", p, "read", m.due)).toHaveLength(1);
  });
});
describe("backup validation", () => {
  it("round trips supported progress and rejects incompatible or corrupt imports", () => {
    const p = emptyProgress();
    const a = attempt();
    p.attempts.push(a);
    const m = updateMemory(undefined, a);
    p.memories[m.key] = m;
    expect(validateProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(() => validateProgress({ version: 8 })).toThrow();
    expect(() =>
      validateProgress({ ...p, memories: { [m.key]: { ...m, stage: 99 } } }),
    ).toThrow();
    expect(() => validateProgress({ ...p, attempts: [a, a] })).toThrow();
    expect(() =>
      validateProgress({ ...p, sessions: [{ id: "x", chapter: "made-up" }] }),
    ).toThrow();
  });
});
