import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUNDLED_VOICE_URI,
  getAvailableVoices,
  playJapanese,
  recordings,
  stopAudio,
} from "./audio";

const speak = vi.fn();
const cancel = vi.fn();
const voice = { lang: "ja-JP", voiceURI: "test-ja" };
const originalMayRecording = recordings["kanji-五"];
const audioClips: {
  src: string;
  onended?: (() => void) | null;
  onerror?: (() => void) | null;
  pause: ReturnType<typeof vi.fn>;
}[] = [];
const play = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  audioClips.length = 0;
  play.mockResolvedValue(undefined);
  vi.stubGlobal("window", { speechSynthesis: {}, dispatchEvent: vi.fn() });
  vi.stubGlobal(
    "Audio",
    class {
      pause = vi.fn();
      play = play;
      constructor(public src: string) {
        audioClips.push(this);
      }
    },
  );
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
  recordings["kanji-五"] = originalMayRecording;
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

  it("returns false for unknown future content without any sound source", () => {
    speechSynthesis.getVoices = () => [];
    expect(playJapanese("未知の単語", "future-item")).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });

  it("uses the bundled clip by default even if a device voice exists", () => {
    recordings["kanji-五"] = "audio/gogatsu.mp3";
    expect(playJapanese("五月", "kanji-五")).toBe(true);
    expect(play).toHaveBeenCalledOnce();
    expect(speak).not.toHaveBeenCalled();
  });

  it("offers and plays built-in Japanese when the device has no voices", () => {
    speechSynthesis.getVoices = () => [];
    expect(getAvailableVoices()[0].voiceURI).toBe(BUNDLED_VOICE_URI);
    expect(playJapanese("五月", "kanji-五")).toBe(true);
    expect(audioClips[0].src).toContain(originalMayRecording);
    expect(speak).not.toHaveBeenCalled();
  });

  it("falls back to the built-in clip if a selected device voice fails", () => {
    expect(playJapanese("五月", "kanji-五", "test-ja")).toBe(true);
    speak.mock.calls[0][0].onerror({ error: "synthesis-failed" });
    expect(audioClips).toHaveLength(1);
    expect(audioClips[0].src).toContain(originalMayRecording);
  });

  it("stops old clips and ignores their late playback errors", async () => {
    let reject!: (error: Error) => void;
    play.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    const onEnd = vi.fn();
    playJapanese("五月", "kanji-五", "", onEnd);
    const old = audioClips[0];
    playJapanese("が", "h-が");
    expect(old.pause).toHaveBeenCalled();
    expect(old.onended).toBeNull();
    reject(new Error("interrupted"));
    await Promise.resolve();
    expect(window.dispatchEvent).not.toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });
});
