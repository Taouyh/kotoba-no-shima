import { kana } from "../src/data/curriculum";
import { studyEntries } from "../src/data/catalog";
import {
  speechTextForItem,
  synthesisTextForItem,
} from "../src/lib/speech-text";

const targets = [
  ...kana.map((item) => ({
    id: item.id,
    text: item.glyph,
    // Force standalone は/へ to their kana sounds, rather than particles.
    speech: synthesisTextForItem(item.glyph, item.id),
  })),
  ...studyEntries
    .filter((entry) => entry.reading)
    .map((entry) => ({
      id: entry.id,
      text: speechTextForItem(entry.term, entry.id),
      speech: synthesisTextForItem(entry.term, entry.id),
    })),
  { id: "voice-test", text: "あいうえお", speech: "アイウエオ" },
];
process.stdout.write(JSON.stringify(targets, null, 2));
