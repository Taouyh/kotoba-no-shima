import { entryById } from "../data/catalog";
import { kanaById } from "../data/curriculum";

export function speechTextForItem(text: string, itemId: string): string {
  const entry = entryById.get(itemId);
  // Keep annotated word readings, while sentences retain particle context.
  return entry && (entry.kind === "kanji" || entry.kind === "word")
    ? entry.reading
    : text;
}

export function synthesisTextForItem(text: string, itemId: string): string {
  const toKatakana = (value: string) =>
    value.replace(/[ぁ-ゖ]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) + 0x60),
    );
  const kana = kanaById.get(itemId);
  if (kana) return toKatakana(kana.glyph).replaceAll("ヲ", "オ");
  const entry = entryById.get(itemId);
  if (entry && (entry.kind === "word" || entry.kind === "kanji"))
    return toKatakana(entry.reading);
  return itemId === "voice-test" ? "アイウエオ" : text;
}
