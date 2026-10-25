import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../data/audio-manifest.json";
import index from "../../docs/audio-index.json";
import { kana } from "../data/curriculum";
import { studyEntries } from "../data/catalog";
import { synthesisTextForItem } from "./speech-text";

describe("bundled Japanese audio", () => {
  it("covers every currently playable kana, word and phrase with the intended reading", () => {
    const targets = [
      ...kana.map((item) => ({ id: item.id, text: item.glyph })),
      ...studyEntries
        .filter((entry) => entry.reading)
        .map((entry) => ({ id: entry.id, text: entry.term })),
      { id: "voice-test", text: "あいうえお" },
    ];
    const clips = new Map(index.clips.map((clip) => [clip.file, clip]));
    for (const target of targets) {
      const file = (manifest.files as Record<string, string>)[target.id];
      expect(file, target.id).toBeTruthy();
      expect(clips.get(file)?.speech, target.id).toBe(
        synthesisTextForItem(target.text, target.id),
      );
    }
    expect(targets).toHaveLength(Object.keys(manifest.files).length);
  });
  it("ships complete, non-empty MP3 assets matching the recorded digests", () => {
    for (const clip of index.clips) {
      const bytes = readFileSync(`public/${clip.file}`);
      expect(bytes.byteLength, clip.file).toBe(clip.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        clip.sha256,
      );
      expect(clip.duration).toBeGreaterThan(0.15);
    }
  });
});
