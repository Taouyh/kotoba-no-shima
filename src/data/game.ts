export const decorations = [
  {
    id: "seedling",
    name: "第一株小苗",
    glyph: "芽",
    cost: 0,
    type: "plant",
    description: "每一段旅程，都从一点点生长开始。",
    color: "#93b481",
  },
  {
    id: "flower",
    name: "窗边野花",
    glyph: "花",
    cost: 8,
    type: "flower",
    description: "给努力回忆的一天添一点颜色。",
    color: "#d6a0a3",
  },
  {
    id: "lantern",
    name: "晚归小灯",
    glyph: "灯",
    cost: 12,
    type: "lantern",
    description: "为每次回来复习的你留一盏灯。",
    color: "#d1ac6b",
  },
  {
    id: "books",
    name: "读书角",
    glyph: "本",
    cost: 16,
    type: "books",
    description: "假名、汉字、词语，一本本积起来。",
    color: "#829f9c",
  },
  {
    id: "cat",
    name: "午睡小猫",
    glyph: "猫",
    cost: 22,
    type: "cat",
    description: "认真练习之后，也值得好好休息。",
    color: "#bda58d",
  },
  {
    id: "sakura",
    name: "小小樱树",
    glyph: "桜",
    cost: 28,
    type: "tree",
    description: "给还没开花的记忆多一点时间。",
    color: "#ddaeb4",
  },
  {
    id: "pond",
    name: "清水小池",
    glyph: "泉",
    cost: 32,
    type: "pond",
    description: "波纹会散开，记住的声音会留下。",
    color: "#80aaa5",
  },
  {
    id: "bridge",
    name: "溪上木桥",
    glyph: "橋",
    cost: 38,
    type: "bridge",
    description: "从认识到理解，也从这里到远方。",
    color: "#b49672",
  },
  {
    id: "windbell",
    name: "夏日风铃",
    glyph: "風",
    cost: 44,
    type: "bell",
    description: "听见风，也听见新的日语表达。",
    color: "#a6b1c0",
  },
  {
    id: "tea",
    name: "一盏热茶",
    glyph: "茶",
    cost: 18,
    type: "tea",
    description: "给坚持学习的自己留一段安静时间。",
    color: "#9caf83",
  },
  {
    id: "mailbox",
    name: "小岛信箱",
    glyph: "便",
    cost: 26,
    type: "mailbox",
    description: "把今天记住的话，寄给未来的自己。",
    color: "#c08973",
  },
  {
    id: "lighthouse",
    name: "远方灯塔",
    glyph: "海",
    cost: 60,
    type: "lighthouse",
    description: "从日语基础，慢慢走向介护工作的目标。",
    color: "#92a7b0",
  },
] as const;
export const decorationById = new Map<string, (typeof decorations)[number]>(
  decorations.map((d) => [d.id, d]),
);
export const gardenSlots = [
  { id: "garden", label: "门前花园" },
  { id: "porch", label: "窗边小台" },
  { id: "desk", label: "读书角落" },
  { id: "pond", label: "溪流边上" },
] as const;
export type GardenSlot = (typeof gardenSlots)[number]["id"];
export interface Garden {
  earned: number;
  owned: string[];
  placements: Record<GardenSlot, string | null>;
  stamps: string[];
}
export const newGarden = (): Garden => ({
  earned: 0,
  owned: ["seedling"],
  placements: { garden: "seedling", porch: null, desk: null, pond: null },
  stamps: [],
});
