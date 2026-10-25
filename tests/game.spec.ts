import { expect, test } from "@playwright/test";
import { kana, concepts } from "../src/data/curriculum";

test("home, chapter exploration and responsive layout render without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "今天，也和日语靠近一点。" }),
  ).toBeVisible();
  await expect(page.locator(".chapter-card")).toHaveCount(6);
  await page.screenshot({
    path: "work/screenshots/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "探索浊音溪谷" }).click();
  await expect(page.getByRole("dialog", { name: "浊音溪谷" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("a complete daily adventure persists answers and appears in the journal after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始今日冒险" }).click();
  await expect(page.locator(".intro-kana")).toHaveCount(6);
  await page.getByRole("button", { name: "准备好了，开始练习" }).click();
  for (let i = 0; i < 12; i++) {
    const glyph = (await page.locator(".question-glyph").textContent())!.trim();
    const item = kana.find((k) => k.glyph === glyph)!;
    await page.getByLabel("输入罗马字读音").fill(item.reading);
    await page.getByLabel("输入罗马字读音").press("Enter");
    await expect(page.locator(".answer-feedback")).toContainText("答对了");
    if (i === 0)
      await page.screenshot({
        path: "work/screenshots/practice-desktop.png",
        fullPage: true,
      });
    await page
      .getByRole("button", {
        name: i === 11 ? "看看本轮收获" : "下一题",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "这次冒险，完成！" }),
  ).toBeVisible();
  await expect(page.locator(".result-stats")).toContainText("100");
  await page.getByRole("button", { name: "回到我的小岛" }).click();
  await expect(page.locator(".daily-number")).toContainText("12");
  await page.reload();
  await expect(page.locator(".daily-number")).toContainText("12");
  await page.getByRole("button", { name: "记忆手帐", exact: true }).click();
  await expect(page.locator(".stat-card").first()).toContainText("12");
  await expect(page.locator(".achievement.unlocked")).toHaveCount(1);
});

test("mistakes and hints are retained when ending a partial session", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "开始今日冒险" }).click();
  await page.getByRole("button", { name: "准备好了，开始练习" }).click();
  await page.getByLabel("输入罗马字读音").fill("wrong");
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toContainText("重新认识一下");
  await page.getByRole("button", { name: "下一题", exact: true }).click();
  await page.getByRole("button", { name: "给我一点提示" }).click();
  await expect(page.locator(".hint-box")).toBeVisible();
  const glyph = (await page.locator(".question-glyph").textContent())!.trim();
  await page
    .getByLabel("输入罗马字读音")
    .fill(kana.find((k) => k.glyph === glyph)!.reading);
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toContainText(
    "下次试着独立回忆",
  );
  await page.getByRole("button", { name: "返回小岛" }).click();
  await page.getByRole("button", { name: "保存并返回" }).click();
  await expect(page.locator(".daily-number")).toContainText("2");
  await page.getByRole("button", { name: "记忆手帐", exact: true }).click();
  await expect(page.locator(".confusion-list")).toContainText("答对 0 / 1 次");
  await expect(page.locator(".stat-card").last()).toContainText("0");
});

test("chart covers scripts, supports lookup and opens focused practice", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "五十音图", exact: true }).click();
  await expect(page.locator("button.kana-cell")).toHaveCount(46);
  await page.getByRole("button", { name: "片假名 ア" }).click();
  await expect(page.locator("button.kana-cell")).toHaveCount(46);
  await page.getByLabel("查找假名或读音").fill("tsu");
  await expect(page.locator("button.kana-cell")).toHaveCount(1);
  await page.locator("button.kana-cell").click();
  await expect(page.locator(".kana-detail-glyph")).toHaveText("ツ");
  await page.getByRole("button", { name: "练练这个假名和同组伙伴" }).click();
  await expect(
    page.getByRole("heading", { name: "先认识，再试着回忆。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "准备好了，开始练习" }).click();
  await expect(page.locator(".question-glyph")).toHaveText("ツ");
});

test("rhythm and pitch lessons expose the explanation only after answering", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".chapter-card.teal").click();
  await page.getByRole("button", { name: "开始小课堂" }).click();
  await expect(page.locator(".mora-boxes")).toHaveCount(0);
  await page.locator(".answer-options button").first().click();
  await expect(page.locator(".answer-feedback")).toBeVisible();
  await expect(page.locator(".mora-boxes").first()).toBeVisible();
  await page.screenshot({
    path: "work/screenshots/rhythm-desktop.png",
    fullPage: true,
  });
});

test("backup export/import works and invalid files never replace current progress", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "小岛设置", exact: true }).click();
  await page.getByLabel("默认答题方式").selectOption("choice");
  const exported = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出备份", exact: true }).click();
  const download = await exported;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString()).settings.inputMode).toBe("choice");
  await page.getByLabel("选择进度备份").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator(".toast")).toContainText("格式不兼容");
  await expect(page.getByLabel("默认答题方式")).toHaveValue("choice");
  await page.getByLabel("默认答题方式").selectOption("typing");
  await page.getByLabel("选择进度备份").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await expect(
    page.getByRole("dialog", { name: "确认导入备份" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "确认替换并导入" }).click();
  await expect(page.getByLabel("默认答题方式")).toHaveValue("choice");
  await page.reload();
  await page.getByRole("button", { name: "小岛设置", exact: true }).click();
  await expect(page.getByLabel("默认答题方式")).toHaveValue("choice");
  await page.getByRole("button", { name: "重新开始我的小岛" }).click();
  await expect(
    page.getByRole("button", { name: "清空并重新开始" }),
  ).toBeDisabled();
  await page.getByPlaceholder("重新开始", { exact: true }).fill("重新开始");
  await page.getByRole("button", { name: "清空并重新开始" }).click();
  await expect(page.getByLabel("默认答题方式")).toHaveValue("typing");
});

test("mobile home, chart and practice fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "今天，也和日语靠近一点。" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/screenshots/home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "五十音图", exact: true }).click();
  await expect(page.locator("button.kana-cell")).toHaveCount(46);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/screenshots/chart-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "学习地图", exact: true }).click();
  await page.getByRole("button", { name: "开始今日冒险" }).click();
  await page.getByRole("button", { name: "准备好了，开始练习" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/screenshots/practice-mobile.png",
    fullPage: true,
  });
});

test("the production app opens and remains usable offline after initial caching", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "今天，也和日语靠近一点。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "五十音图", exact: true }).click();
  await expect(page.locator("button.kana-cell")).toHaveCount(46);
});

test("pitch examples can be completed and display labelled illustrative tones", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".chapter-card.purple").click();
  await page.getByRole("button", { name: "开始小课堂" }).click();
  let toneExamples = 0;
  for (let i = 0; i < 6; i++) {
    const display = (await page
      .locator(".question-glyph")
      .textContent())!.trim();
    const concept = concepts.find((c) => c.display === display)!;
    await page
      .locator(".answer-options button")
      .filter({ hasText: concept.answer })
      .click();
    await expect(page.locator(".answer-feedback")).toContainText("答对了");
    if (concept.tones) {
      toneExamples++;
      await expect(page.locator(".tone-diagram")).toBeVisible();
      await expect(page.locator(".block-note")).toContainText(
        "不是日语真人发音",
      );
      await page.getByRole("button", { name: "播放高低示意音" }).click();
    }
    await page
      .getByRole("button", {
        name: i === 5 ? "看看本轮收获" : "下一题",
        exact: true,
      })
      .click();
  }
  expect(toneExamples).toBe(4);
  await expect(
    page.getByRole("heading", { name: "这次冒险，完成！" }),
  ).toBeVisible();
});

test("a device without Japanese voices can still enter bundled listening practice", async ({
  page,
}) => {
  await page.addInitScript(() => {
    speechSynthesis.getVoices = () => [];
  });
  await page.goto("/");
  await page.locator(".chapter-card.orange").click();
  await expect(
    page.getByRole("button", { name: "听音辨认 · 日语参考音" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "听音辨认 · 日语参考音" }).click();
  await expect(
    page.getByRole("heading", { name: "先认识，再试着回忆。" }),
  ).toBeVisible();
});
