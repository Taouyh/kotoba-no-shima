import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  getJapaneseVoices,
  initializeNativeAudio,
  playJapanese,
  stopAudio,
} from "./audio";

vi.mock("./platform", () => ({ isAndroid: true }));
const native = vi.hoisted(() => ({
  getSupportedVoices: vi.fn(),
  speak: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("@capacitor-community/text-to-speech", () => ({
  TextToSpeech: native,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  native.stop.mockResolvedValue(undefined);
  native.speak.mockResolvedValue(undefined);
  native.getSupportedVoices.mockResolvedValue({
    voices: [
      { lang: "en-US", voiceURI: "en", name: "English" },
      { lang: "ja-JP", voiceURI: "ja", name: "日本語" },
    ],
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Android system speech", () => {
  it("loads Japanese voices without the browser speech API and keeps the native voice index", async () => {
    await initializeNativeAudio();
    expect(getJapaneseVoices().map((v) => v.voiceURI)).toEqual(["ja"]);
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "kana-voices-changed" }),
    );
    expect(playJapanese("五月", "kanji-五", "ja")).toBe(true);
    expect(native.speak).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "ごがつ",
        voice: 1,
        lang: "ja-JP",
        queueStrategy: 0,
      }),
    );
    stopAudio();
    expect(native.stop).toHaveBeenCalled();
  });
  it("disables listening when the device has no Japanese voice", async () => {
    native.getSupportedVoices.mockResolvedValue({ voices: [] });
    await initializeNativeAudio();
    expect(playJapanese("が", "h-が")).toBe(false);
    expect(native.speak).not.toHaveBeenCalled();
  });
});
