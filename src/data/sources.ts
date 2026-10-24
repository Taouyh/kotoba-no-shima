import type { Resource } from "./study-types";

export const resources: Resource[] = [
  {
    id: "jlpt-level",
    title: "JLPT N4 能力目标",
    publisher: "日本国际交流基金 / 日本国际教育支援协会",
    url: "https://www.jlpt.jp/about/levelsummary.html",
    description:
      "N4 以基本日语理解为目标，包含熟悉的生活话题阅读及较慢语速的日常会话理解。",
    checked: "2026-10-24",
    category: "n4",
  },
  {
    id: "jlpt-faq",
    title: "JLPT 常见问题与出题范围说明",
    publisher: "JLPT 官方",
    url: "https://www.jlpt.jp/faq/",
    description:
      "新考试不公布固定的词汇、汉字和语法项目清单。本游戏为自主编写的 N4 目标学习包。",
    checked: "2026-10-24",
    category: "n4",
  },
  {
    id: "jlpt-sample",
    title: "官方题型与练习入口",
    publisher: "JLPT 官方",
    url: "https://www.jlpt.jp/samples/forlearners.html",
    description:
      "了解正式考试题型。游戏题为原创练习，不是官方真题或完整模拟试卷。",
    checked: "2026-10-24",
    category: "n4",
  },
  {
    id: "care-materials",
    title: "介护学习资料总入口",
    publisher: "日本厚生劳动省",
    url: "https://www.mhlw.go.jp/stf/newpage_28131.html",
    description: "教材、术语集、学习网站及勘误的官方入口。用于查找后续更新。",
    checked: "2026-10-24",
    category: "care",
  },
  {
    id: "care-text-ja",
    title: "特定技能学习教材 · 改订第 2 版（日语）",
    publisher: "日本厚生劳动省 / 日本介护福祉士会",
    url: "https://www.mhlw.go.jp/content/12000000/001471473.pdf",
    description:
      "官方页面指定用于 2026 年度起考试的教材，含介护基础、身心机制、沟通及生活支援。PDF 约 20 MB。",
    checked: "2026-10-24",
    category: "care",
  },
  {
    id: "care-text-zh",
    title: "特定技能学习教材 · 改订第 2 版（中文）",
    publisher: "日本厚生劳动省 / 日本介护福祉士会",
    url: "https://www.mhlw.go.jp/content/12000000/001472071.pdf",
    description:
      "配合日语版学习术语和内容，PDF 约 22.5 MB。外部资料需联网打开。",
    checked: "2026-10-24",
    category: "care",
  },
  {
    id: "care-errata",
    title: "改订第 2 版 · 官方勘误",
    publisher: "日本厚生劳动省",
    url: "https://www.mhlw.go.jp/content/12000000/001505095.pdf",
    description: "与教材配套查阅，包括词语读音与表述的订正。",
    checked: "2026-10-24",
    category: "care",
  },
  {
    id: "care-exam",
    title: "介护特定技能考试概要与样题",
    publisher: "日本厚生劳动省",
    url: "https://www.mhlw.go.jp/stf/newpage_000117702.html",
    description:
      "分别查看介护技能评价和介护日语评价的内容与官方样题。游戏完成度不代表考试合格。",
    checked: "2026-10-24",
    category: "care",
  },
  {
    id: "care-prometric",
    title: "考试信息与报名入口",
    publisher: "Prometric（考试实施机构）",
    url: "https://www.prometric-jp.com/ssw/test_list/archives/2",
    description: "核对当期名称、地点、安排和报名条件。请在报名时重查最新页面。",
    checked: "2026-10-24",
    category: "care",
  },
  {
    id: "care-nihongo",
    title: "にほんごをまなぼう",
    publisher: "日本介护福祉士会",
    url: "https://aft.kaigo-nihongo.jp/",
    description: "免费介护日语学习平台，可与本游戏的词汇与场景练习配合使用。",
    checked: "2026-10-24",
    category: "care",
  },
];
export const resourceById = new Map(resources.map((r) => [r.id, r]));
