export type Script = "hiragana" | "katakana";
export type KanaKind = "basic" | "voiced" | "yoon";
export type ChapterId =
  "hiragana" | "voiced" | "katakana" | "yoon" | "rhythm" | "pitch";
export interface Kana {
  id: string;
  glyph: string;
  reading: string;
  aliases: string[];
  script: Script;
  kind: KanaKind;
  row: string;
  hint: string;
}
export interface Chapter {
  id: ChapterId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  glyph: string;
  color: string;
}
export const chapters: Chapter[] = [
  {
    id: "hiragana",
    name: "平假名之森",
    subtitle: "清音 · 拨音",
    description: "熟悉的起点，让每个读音更自然。",
    badge: "温故知新",
    glyph: "あ",
    color: "green",
  },
  {
    id: "voiced",
    name: "浊音溪谷",
    subtitle: "浊音 · 半浊音",
    description: "从「先想清音」到直接读出声音。",
    badge: "推荐从这里开始",
    glyph: "が",
    color: "orange",
  },
  {
    id: "katakana",
    name: "片假名港口",
    subtitle: "清音 · 浊音 · 半浊音",
    description: "为熟悉的声音，认识另一副模样。",
    badge: "你的下一站",
    glyph: "ア",
    color: "blue",
  },
  {
    id: "yoon",
    name: "拗音花园",
    subtitle: "平假名 · 片假名组合",
    description: "小小的ゃゅょ，合起来只占一拍。",
    badge: "组合练习",
    glyph: "きゃ",
    color: "pink",
  },
  {
    id: "rhythm",
    name: "节奏海岸",
    subtitle: "长音 · 促音 · 拨音 · 拍感",
    description: "听见停顿，也看见声音的长度。",
    badge: "找准节奏",
    glyph: "っ",
    color: "teal",
  },
  {
    id: "pitch",
    name: "高低音山丘",
    subtitle: "词的高低重音 · 句子语调",
    description: "从高低示意，开始感受声音的起伏。",
    badge: "轻轻入门",
    glyph: "↗",
    color: "purple",
  },
];

const basics = [
  ["あいうえお", ["a", "i", "u", "e", "o"], "あ行"],
  ["かきくけこ", ["ka", "ki", "ku", "ke", "ko"], "か行"],
  ["さしすせそ", ["sa", "shi", "su", "se", "so"], "さ行"],
  ["たちつてと", ["ta", "chi", "tsu", "te", "to"], "た行"],
  ["なにぬねの", ["na", "ni", "nu", "ne", "no"], "な行"],
  ["はひふへほ", ["ha", "hi", "fu", "he", "ho"], "は行"],
  ["まみむめも", ["ma", "mi", "mu", "me", "mo"], "ま行"],
  ["やゆよ", ["ya", "yu", "yo"], "や行"],
  ["らりるれろ", ["ra", "ri", "ru", "re", "ro"], "ら行"],
  ["わをん", ["wa", "wo", "n"], "わ行・ん"],
] as const;
const voiced = [
  ["がぎぐげご", ["ga", "gi", "gu", "ge", "go"], "が行"],
  ["ざじずぜぞ", ["za", "ji", "zu", "ze", "zo"], "ざ行"],
  ["だぢづでど", ["da", "ji", "zu", "de", "do"], "だ行"],
  ["ばびぶべぼ", ["ba", "bi", "bu", "be", "bo"], "ば行"],
  ["ぱぴぷぺぽ", ["pa", "pi", "pu", "pe", "po"], "ぱ行"],
] as const;
const yoonBases = [
  ["き", "ky"],
  ["し", "sh"],
  ["ち", "ch"],
  ["に", "ny"],
  ["ひ", "hy"],
  ["み", "my"],
  ["り", "ry"],
  ["ぎ", "gy"],
  ["じ", "j"],
  ["ぢ", "j"],
  ["び", "by"],
  ["ぴ", "py"],
] as const;
export const toKatakana = (value: string) =>
  value.replace(/[\u3041-\u3096]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) + 0x60),
  );
const aliases: Record<string, string[]> = {
  shi: ["si"],
  chi: ["ti"],
  tsu: ["tu"],
  fu: ["hu"],
  ji: ["zi"],
  sha: ["sya"],
  shu: ["syu"],
  sho: ["syo"],
  cha: ["tya", "cya"],
  chu: ["tyu", "cyu"],
  cho: ["tyo", "cyo"],
  ja: ["jya", "zya"],
  ju: ["jyu", "zyu"],
  jo: ["jyo", "zyo"],
  wo: ["o"],
  n: ["n'", "nn"],
};
function makeHint(glyph: string, reading: string, kind: KanaKind): string {
  if ("ぢづ".includes(glyph))
    return `${glyph} 在标准日语中通常与${glyph === "ぢ" ? "じ（ji）" : "ず（zu）"}同音；输入法拼写与读音需要区分。`;
  if (glyph.startsWith("ぢ"))
    return "这组读音通常与じゃ・じゅ・じょ相同，输入法中可用 dya / dyu / dyo。";
  if (kind === "yoon")
    return `${glyph} 作为一个组合读出，只占一拍；注意后面是小字。`;
  if (kind === "voiced") {
    const base = glyph.normalize("NFD")[0];
    return `${base} 加${glyph.normalize("NFD")[1] === "\u309a" ? "半浊音符号「゜」" : "浊音符号「゛」"}后读 ${reading}。这条规则只是起步提示，接着试着直接回忆。`;
  }
  if (glyph === "を") return "作为助词时通常读 o；罗马字 wo 与 o 均可。";
  if (glyph === "ん") return "拨音，单独占一拍；实际发音会随后续声音变化。";
  return `试着把字形「${glyph}」与声音 ${reading} 联系起来。先自己回忆，再查看读音。`;
}
const hira: Kana[] = [];
for (const [rows, kind] of [
  [basics, "basic"],
  [voiced, "voiced"],
] as const) {
  for (const [glyphs, readings, row] of rows) {
    [...glyphs].forEach((glyph, index) => {
      const reading = readings[index];
      const extra =
        glyph === "ぢ" ? ["di"] : glyph === "づ" ? ["du", "dzu"] : [];
      hira.push({
        id: `h-${glyph}`,
        glyph,
        reading,
        aliases: [...(aliases[reading] || []), ...extra],
        script: "hiragana",
        kind,
        row,
        hint: makeHint(glyph, reading, kind),
      });
    });
  }
}
for (const [base, prefix] of yoonBases) {
  [..."ゃゅょ"].forEach((suffix, index) => {
    const reading = prefix + ["a", "u", "o"][index];
    const glyph = base + suffix;
    hira.push({
      id: `h-${glyph}`,
      glyph,
      reading,
      aliases: [
        ...(aliases[reading] || []),
        ...(base === "ぢ" ? ["dy" + ["a", "u", "o"][index]] : []),
      ],
      script: "hiragana",
      kind: "yoon",
      row: `${base}ゃ行`,
      hint: makeHint(glyph, reading, "yoon"),
    });
  });
}
export const kana: Kana[] = [
  ...hira,
  ...hira.map((item) => ({
    ...item,
    id: `k-${toKatakana(item.glyph)}`,
    glyph: toKatakana(item.glyph),
    script: "katakana" as const,
    row: toKatakana(item.row.replace("行", "")) + "行",
    hint: `${toKatakana(item.glyph)} 与平假名 ${item.glyph} 读音相同。${item.kind === "yoon" ? "组合只占一拍。" : item.hint}`,
  })),
];
export const kanaById = new Map(kana.map((item) => [item.id, item]));
export const kanaForChapter = (id: ChapterId): Kana[] =>
  kana.filter((item) => {
    if (id === "hiragana")
      return item.script === "hiragana" && item.kind === "basic";
    if (id === "voiced")
      return item.script === "hiragana" && item.kind === "voiced";
    if (id === "katakana")
      return item.script === "katakana" && item.kind !== "yoon";
    return id === "yoon" && item.kind === "yoon";
  });

export interface Concept {
  id: string;
  chapter: "rhythm" | "pitch";
  label: string;
  prompt: string;
  display: string;
  options: string[];
  answer: string;
  explanation: string;
  morae?: string[];
  tones?: ("L" | "H")[];
  compare?: { text: string; morae: string[] };
}
export const concepts: Concept[] = [
  {
    id: "r-obasan",
    chapter: "rhythm",
    label: "长音",
    prompt: "「おばあさん」有几拍？",
    display: "おばあさん",
    options: ["3 拍", "4 拍", "5 拍", "6 拍"],
    answer: "5 拍",
    explanation:
      "お・ば・あ・さ・ん，共五拍。「ばあ」的长元音占两拍；ん也占一拍。",
    morae: ["お", "ば", "あ", "さ", "ん"],
    compare: { text: "おばさん", morae: ["お", "ば", "さ", "ん"] },
  },
  {
    id: "r-ojisan",
    chapter: "rhythm",
    label: "长音",
    prompt: "「おじいさん」比「おじさん」多出什么？",
    display: "おじいさん",
    options: ["一个长音的延长拍", "一个促音", "一个拗音", "读音完全相同"],
    answer: "一个长音的延长拍",
    explanation:
      "お・じ・い・さ・ん是五拍；お・じ・さ・ん是四拍。延长声音会改变词义。",
    morae: ["お", "じ", "い", "さ", "ん"],
  },
  {
    id: "r-kitte",
    chapter: "rhythm",
    label: "促音",
    prompt: "「きって」中的小っ应怎样理解？",
    display: "きって",
    options: [
      "读作 tsu",
      "占一拍，为后面的 t 做闭塞准备",
      "不占时间，直接跳过",
      "把き读成拗音",
    ],
    answer: "占一拍，为后面的 t 做闭塞准备",
    explanation:
      "き・っ・て是三拍。这里的小っ不读 tsu，要在接到て前保留一拍的闭塞。",
    morae: ["き", "っ", "て"],
    compare: { text: "きて", morae: ["き", "て"] },
  },
  {
    id: "r-gakkou",
    chapter: "rhythm",
    label: "长音与促音",
    prompt: "「がっこう」有几拍？",
    display: "がっこう",
    options: ["2 拍", "3 拍", "4 拍", "5 拍"],
    answer: "4 拍",
    explanation:
      "が・っ・こ・う是四拍。っ占一拍；这里的こう通常发长元音，也占两拍。",
    morae: ["が", "っ", "こ", "う"],
  },
  {
    id: "r-kya",
    chapter: "rhythm",
    label: "拗音",
    prompt: "哪一个只占一拍？",
    display: "きゃ / きや",
    options: ["きゃ", "きや", "两个都是两拍", "两个都是一拍"],
    answer: "きゃ",
    explanation: "きゃ是拗音，一拍；きや里的や是大字，需要读作き・や，两拍。",
    morae: ["きゃ"],
    compare: { text: "きや", morae: ["き", "や"] },
  },
  {
    id: "r-kyou",
    chapter: "rhythm",
    label: "拗音与长音",
    prompt: "「きょう」有几拍？",
    display: "きょう",
    options: ["1 拍", "2 拍", "3 拍", "4 拍"],
    answer: "2 拍",
    explanation:
      "きょ・う是两拍。拗音きょ只占一拍，后面的长音延长部分再占一拍。",
    morae: ["きょ", "う"],
  },
  {
    id: "r-coffee",
    chapter: "rhythm",
    label: "片假名长音",
    prompt: "「コーヒー」中的ー表示什么？",
    display: "コーヒー",
    options: ["把前面的元音延长一拍", "停顿一拍", "重读前一个字", "读作 n"],
    answer: "把前面的元音延长一拍",
    explanation: "コ・ー・ヒ・ー共四拍。「ー」是长音符号，延长前面的元音。",
    morae: ["コ", "ー", "ヒ", "ー"],
  },
  {
    id: "r-hon",
    chapter: "rhythm",
    label: "拨音",
    prompt: "「ほん」有几拍？",
    display: "ほん",
    options: ["1 拍", "2 拍", "3 拍", "无法判断"],
    answer: "2 拍",
    explanation: "ほ・ん是两拍。拨音ん单独占一拍，不能在计拍时省略。",
    morae: ["ほ", "ん"],
  },
  {
    id: "r-shashin",
    chapter: "rhythm",
    label: "促音",
    prompt: "「ざっし」的っ一定是完全静音吗？",
    display: "ざっし",
    options: [
      "是，永远完全静音",
      "不是，这里会延长后面的摩擦声",
      "应读成 tsu",
      "应把ざ读成长音",
    ],
    answer: "不是，这里会延长后面的摩擦声",
    explanation:
      "促音的实现随后面的辅音变化。ざっし中会延长し开头的摩擦声，不能把所有促音都学成完全静音。",
    morae: ["ざ", "っ", "し"],
  },
  {
    id: "r-kippu",
    chapter: "rhythm",
    label: "促音",
    prompt: "「きっぷ」与「きぷ」相差几拍？",
    display: "きっぷ",
    options: ["0 拍", "1 拍", "2 拍", "3 拍"],
    answer: "1 拍",
    explanation: "き・っ・ぷ为三拍，き・ぷ为两拍。小っ为后续p保留一拍闭塞。",
    morae: ["き", "っ", "ぷ"],
  },
  {
    id: "p-ame-rain",
    chapter: "pitch",
    label: "东京日语 · 词重音",
    prompt: "「雨（あめ）」的典型高低走势是哪一种？",
    display: "雨 · あめ",
    options: ["高 → 低", "低 → 高", "高 → 高", "低 → 低"],
    answer: "高 → 低",
    explanation:
      "东京日语中，雨常为头高型：あ高、め低。这里的高低是音高，不是大声与小声。",
    morae: ["あ", "め"],
    tones: ["H", "L"],
  },
  {
    id: "p-ame-candy",
    chapter: "pitch",
    label: "东京日语 · 词重音",
    prompt: "「飴（あめ）」的典型高低走势是哪一种？",
    display: "飴 · あめ",
    options: ["高 → 低", "低 → 高", "高 → 高", "低 → 低"],
    answer: "低 → 高",
    explanation:
      "东京日语中，飴常为平板型：あ低、め高。与雨形成对比；不同地区的重音可能不同。",
    morae: ["あ", "め"],
    tones: ["L", "H"],
  },
  {
    id: "p-heiban",
    chapter: "pitch",
    label: "平板型",
    prompt: "平板型的词，后接助词时通常怎样？",
    display: "あめが（飴が）",
    options: [
      "词末与助词之间没有重音下降",
      "每一拍都读成低音",
      "最后一拍必须加重音量",
      "每拍交替高低",
    ],
    answer: "词末与助词之间没有重音下降",
    explanation:
      "平板型并不等于所有拍都平着读。东京日语中，飴が通常可示意为低・高・高。",
    morae: ["あ", "め", "が"],
    tones: ["L", "H", "H"],
  },
  {
    id: "p-odaka",
    chapter: "pitch",
    label: "尾高型",
    prompt: "区分平板型与尾高型，为什么常要加助词？",
    display: "はしが（橋が）",
    options: [
      "观察词末到助词之间是否下降",
      "让单词变得更长更响",
      "助词总是高音",
      "助词可以省去词重音",
    ],
    answer: "观察词末到助词之间是否下降",
    explanation:
      "东京日语中，橋が的典型示意为低・高・低。单看两拍词的低高走势，不一定能区分平板和尾高。",
    morae: ["は", "し", "が"],
    tones: ["L", "H", "L"],
  },
  {
    id: "p-volume",
    chapter: "pitch",
    label: "高低基础",
    prompt: "日语词的高低重音，主要描述什么？",
    display: "高低 ≠ 音量",
    options: [
      "音高的变化与下降位置",
      "哪个字喊得最响",
      "哪个字写得最大",
      "每个假名固定的声调",
    ],
    answer: "音高的变化与下降位置",
    explanation:
      "假名没有固定的词重音；需要放进词语与语流中学习。同样的假名串可以有不同的高低模式。",
  },
  {
    id: "p-question",
    chapter: "pitch",
    label: "句子语调",
    prompt: "「そうですか↗」句尾上扬，常可表达什么？",
    display: "そうですか ↗",
    options: ["询问或确认", "促音", "长元音", "所有词都变成平板型"],
    answer: "询问或确认",
    explanation:
      "上扬句调常用于询问或确认；实际表达仍取决于语境。句调与词的高低重音是两个相关但不同的层次。",
  },
];
export const conceptsForChapter = (chapter: ChapterId) =>
  concepts.filter((item) => item.chapter === chapter);
export const chapterCount = (id: ChapterId) =>
  id === "rhythm" || id === "pitch"
    ? conceptsForChapter(id).length
    : kanaForChapter(id).length;
