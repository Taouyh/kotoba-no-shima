import { kana } from "../data/curriculum";
import type { StudyEntry } from "../data/catalog";

export const hiragana = (text: string) =>
  text
    .normalize("NFKC")
    .replace(/[\u30a1-\u30f6]/g, (c) =>
      String.fromCharCode(c.charCodeAt(0) - 0x60),
    );
const readings = new Map(
  kana.filter((k) => k.script === "hiragana").map((k) => [k.glyph, k.reading]),
);
const extra: Record<string, string> = {
  ぁ: "a",
  ぃ: "i",
  ぅ: "u",
  ぇ: "e",
  ぉ: "o",
  ゔ: "vu",
  ふぁ: "fa",
  ふぃ: "fi",
  ふぇ: "fe",
  ふぉ: "fo",
  てぃ: "ti",
  でぃ: "di",
  うぃ: "wi",
  うぇ: "we",
  うぉ: "wo",
  しぇ: "she",
  じぇ: "je",
  ちぇ: "che",
  つぁ: "tsa",
  つぃ: "tsi",
  つぇ: "tse",
  つぉ: "tso",
};
const clean = (text: string) =>
  hiragana(text)
    .trim()
    .toLowerCase()
    .replace(/[\s、。！？?!・「」（）()，,.]/g, "");
export function romanize(reading: string): string {
  const text = [...clean(reading)];
  let result = "";
  let doubled = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === "っ") {
      doubled = true;
      continue;
    }
    if (char === "ー") {
      result += result.match(/[aeiou](?=[^aeiou]*$)/)?.[0] || "";
      continue;
    }
    const pair = char + (text[index + 1] || "");
    const paired = extra[pair] || (pair.length === 2 && readings.get(pair));
    const value = paired || extra[char] || readings.get(char) || char;
    if (paired) index++;
    if (doubled) {
      result += value.startsWith("ch")
        ? "t"
        : /^[bcdfghjklmnpqrstvwxyz]/.test(value)
          ? value[0]
          : "";
      doubled = false;
    }
    result += value;
  }
  return result;
}
export function isCorrectEntryReading(
  entry: StudyEntry,
  answer: string,
): boolean {
  const input = clean(answer);
  const alternatives = [entry.reading, ...(entry.readingAliases || [])].flatMap(
    (reading) => {
      const target = clean(reading);
      const romaji = romanize(target);
      const ime = romaji
        .replace(/shi/g, "si")
        .replace(/chi/g, "ti")
        .replace(/tsu/g, "tu")
        .replace(/fu/g, "hu");
      return [
        target,
        romaji,
        ime,
        ...(target === "こんにちは"
          ? ["konnichiwa"]
          : target === "こんばんは"
            ? ["konbanwa"]
            : []),
      ];
    },
  );
  return alternatives.includes(input);
}
