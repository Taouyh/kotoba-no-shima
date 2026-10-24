import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { playJapanese, recordings, stopAudio } from "./audio";

const speak = vi.fn();
const cancel = vi.fn();
const voice = { lang: "ja-JP", voiceURI: "test-ja" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { speechSynthesis: {} });
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [voice],
    speak,
    cancel,
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(public text: string) {}
    },
  );
});

afterEach(() => {
  stopAudio();
  delete recordings["kanji-五"];
  vi.unstubAllGlobals();
});

describe("Japanese speech input", () => {
  it.each([
    ["kanji-五", "五月", "ごがつ"],
    ["kanji-分", "十分", "じゅっぷん"],
    ["word-十分-じゅうぶん", "十分", "じゅうぶん"],
    ["word-一日-いちにち", "一日", "いちにち"],
    ["word-一日-ついたち", "一日", "ついたち"],
    ["care-word-看護師", "看護師", "かんごし"],
    ["phrase-お名前は何ですか。", "お名前は何ですか。", "お名前は何ですか。"],
    ["h-が", "が", "が"],
    ["voice-test", "あいうえお", "あいうえお"],
  ])("speaks the intended reading for %s", (id, text, expected) => {
    expect(playJapanese(text, id, "test-ja")).toBe(true);
    expect(speak).toHaveBeenCalledOnce();
    expect(speak.mock.calls[0][0]).toMatchObject({
      text: expected,
      lang: "ja-JP",
      voice,
      rate: 0.8,
    });
  });

  it("returns false when no Japanese voice is available", () => {
    speechSynthesis.getVoices = () => [];
    expect(playJapanese("五月", "kanji-五")).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });

  it("still prefers a reviewed recording over synthesized readings", () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    vi.stubGlobal(
      "Audio",
      class {
        play = play;
        pause = pause;
        constructor(public src: string) {}
      },
    );
    recordings["kanji-五"] = "audio/gogatsu.mp3";
    expect(playJapanese("五月", "kanji-五")).toBe(true);
    expect(play).toHaveBeenCalledOnce();
    expect(speak).not.toHaveBeenCalled();
  });
});
