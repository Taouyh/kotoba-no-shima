import { expect, test, type Page } from "@playwright/test";
import { entryById } from "../src/data/catalog";
import { emptyProgress, updateMemory, type Attempt } from "../src/lib/learning";

async function completeStudyRound(page: Page, count = 12) {
  await expect(page.locator(".practice-page")).toBeVisible();
  const intro = page.getByRole("button", { name: "准备好了，开始练习" });
  if (await intro.count()) await intro.click();
  for (let index = 0; index < count; index++) {
    const round = page.locator(".round");
    await expect(round).toBeVisible();
    const id = (await round.getAttribute("data-entry-id"))!;
    const entry = entryById.get(id)!;
    expect(entry, id).toBeTruthy();
    const input = page.getByLabel("输入假名或罗马字");
    if (await input.count()) {
      await input.fill(entry.reading);
      await input.press("Enter");
    } else
      await page
        .locator(".answer-options")
        .getByText(entry.answer || entry.meaning, { exact: true })
        .click();
    await expect(page.locator(".answer-feedback")).toContainText("答对了");
    await page
      .getByRole("button", {
        name: index === count - 1 ? "看看本轮收获" : "下一题",
        exact: true,
      })
      .click();
  }
  await expect(
    page.getByRole("heading", { name: "这次冒险，完成！" }),
  ).toBeVisible();
}

test("N4 map unlocks through study and earned shells buy a persistent decoration", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".world-tabs button").nth(1).click();
  const nextStop = page.locator('[data-lesson-id="n4-kanji-people"]');
  await expect(nextStop).toHaveClass(/locked/);
  await nextStop.click();
  await expect(page.getByRole("dialog")).toContainText("获得首星");
  await expect(page.getByRole("button", { name: "开始认读练习" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "关闭窗口" }).click();
  await page.screenshot({
    path: "work/screenshots/n4-map-desktop.png",
    fullPage: true,
  });
  await page.locator('[data-lesson-id="n4-kanji-time"]').click();
  await page.getByRole("button", { name: "开始认读练习" }).click();
  await completeStudyRound(page);
  await expect(page.locator(".earned-shells")).toContainText("17 枚贝壳");
  await expect(page.locator(".stamp-earned")).toBeVisible();
  await page.getByRole("button", { name: "回到我的小岛" }).click();
  await expect(nextStop).toHaveClass(/unlocked/);
  await page.getByRole("button", { name: "收藏小屋", exact: true }).click();
  await expect(page.locator(".wallet")).toContainText("17");
  await page.getByRole("button", { name: "兑换窗边野花，8枚贝壳" }).click();
  await expect(page.locator(".wallet")).toContainText("9");
  await page.getByLabel("当前摆放位置").selectOption("porch");
  const flower = page
    .locator(".decoration-card")
    .filter({ has: page.getByRole("heading", { name: "窗边野花" }) });
  await flower.getByRole("button", { name: "摆到窗边小台" }).click();
  await expect(
    page.getByRole("button", { name: "选择摆放位置 窗边小台" }),
  ).toContainText("窗边小台");
  await expect(
    page
      .getByRole("button", { name: "选择摆放位置 窗边小台" })
      .getByRole("img"),
  ).toHaveAttribute("aria-label", "窗边野花");
  await page.screenshot({
    path: "work/screenshots/collection-desktop.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "收藏小屋", exact: true }).click();
  await expect(page.locator(".wallet")).toContainText("9");
  await expect(
    page
      .getByRole("button", { name: "选择摆放位置 窗边小台" })
      .getByRole("img"),
  ).toHaveAttribute("aria-label", "窗边野花");
  await page.getByRole("button", { name: /旅行护照/ }).click();
  await expect(page.locator(".travel-stamp.earned")).toHaveCount(1);
});

test("the course library filters, favorites and freely practices a locked topic", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "课程词库", exact: true }).click();
  await page.getByLabel("查找课程词条").fill("冷蔵庫");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "收藏词条 冷蔵庫", exact: true })
    .click();
  await page.getByLabel("只看收藏").check();
  await page.getByLabel("查找课程词条").clear();
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await page.getByRole("button", { name: "收藏小屋", exact: true }).click();
  await expect(page.locator(".favorite-preview")).toContainText("冷蔵庫");
  await page.getByRole("button", { name: "学习地图", exact: true }).click();
  await page.locator(".world-tabs button").nth(1).click();
  await page.locator('[data-lesson-id="n4-kanji-people"]').click();
  await page.getByRole("button", { name: "自由浏览本关内容" }).click();
  await expect(page.getByLabel("主题关卡")).toHaveValue("n4-kanji-people");
  await page
    .locator(".entry-card")
    .first()
    .getByRole("button", { name: "查看" })
    .click();
  await page.getByRole("button", { name: "自由练习这项与同组伙伴" }).click();
  await completeStudyRound(page, 6);
});

test("grammar, care documents and source references are connected to real lessons", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".world-tabs button").nth(1).click();
  await page.locator('[data-lesson-id="n4-grammar-basic"]').click();
  await page.getByRole("button", { name: "开始场景练习" }).click();
  await expect(page.locator(".question-glyph")).toHaveText("句型练习");
  await expect(page.locator(".reading-passage")).toContainText("（　）");
  await completeStudyRound(page);
  await page.getByRole("button", { name: "回到我的小岛" }).click();
  await page.locator(".world-tabs button").nth(2).click();
  await expect(
    page.getByRole("link", { name: /^特定技能学习教材 · 改订第 2 版（日语）/ }),
  ).toHaveAttribute(
    "href",
    "https://www.mhlw.go.jp/content/12000000/001471473.pdf",
  );
  await expect(page.getByRole("link", { name: /官方勘误/ })).toHaveAttribute(
    "href",
    "https://www.mhlw.go.jp/content/12000000/001505095.pdf",
  );
  await page.locator('[data-lesson-id="care-documents"]').click();
  await page.getByRole("button", { name: "自由浏览本关内容" }).click();
  await page
    .locator(".entry-card")
    .first()
    .getByRole("button", { name: "查看" })
    .click();
  await page.getByRole("button", { name: "自由练习这项与同组伙伴" }).click();
  const first = entryById.get(
    (await page.locator(".round").getAttribute("data-entry-id"))!,
  )!;
  await expect(page.locator(".reading-passage")).toHaveText(first.example!);
  await page
    .locator(".answer-options")
    .getByText(first.answer!, { exact: true })
    .click();
  await expect(page.locator(".answer-feedback")).toContainText("答对了");
  await page.screenshot({
    path: "work/screenshots/care-reading-desktop.png",
    fullPage: true,
  });
});

test("a v1 browser snapshot upgrades without losing answers and can be exported intact", async ({
  page,
}) => {
  const { garden: _garden, favorites: _favorites, ...base } = emptyProgress();
  const attempts: Attempt[] = Array.from({ length: 6 }, (_, i) => ({
    id: `old-a-${i}`,
    sessionId: "old-session",
    itemId: "h-が",
    direction: "read",
    answer: "ga",
    correct: true,
    hinted: false,
    slow: false,
    elapsed: 1500,
    at: Date.now() - 3600_000 + i * 1000,
  }));
  let memory = updateMemory(undefined, attempts[0]);
  for (const a of attempts.slice(1)) memory = updateMemory(memory, a);
  const legacy = {
    ...base,
    version: 1,
    attempts,
    memories: { [memory.key]: memory },
    sessions: [
      {
        id: "old-session",
        chapter: "voiced",
        at: attempts[0].at,
        completed: true,
        count: 6,
        correct: 6,
      },
    ],
  };
  await page.goto("/");
  await expect(page.locator(".daily-number")).toBeVisible();
  await page.evaluate(async (snapshot) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("kana-island");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").put({ id: "main", data: snapshot });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
    });
  }, legacy);
  await page.reload();
  await page.getByRole("button", { name: "记忆手帐", exact: true }).click();
  await expect(page.locator(".stat-card").first()).toContainText("6");
  await page.getByRole("button", { name: "收藏小屋", exact: true }).click();
  await expect(page.locator(".wallet")).toContainText("5");
  await page.reload();
  await page.getByRole("button", { name: "收藏小屋", exact: true }).click();
  await expect(page.locator(".wallet")).toContainText("5");
  await page.getByRole("button", { name: "小岛设置", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "导出升级前快照", exact: true })
    .click();
  const download = await downloaded;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const recovered = JSON.parse(Buffer.concat(chunks).toString());
  expect(recovered.version).toBe(1);
  expect(recovered.attempts).toHaveLength(6);
});

test("expanded lessons, library and collection remain usable on narrow screens and offline", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator(".world-tabs button").nth(2).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/screenshots/care-map-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "课程词库", exact: true }).click();
  await page.getByRole("button", { name: "介护特定技能", exact: true }).click();
  await expect(page.locator(".entry-card")).toHaveCount(24);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/screenshots/library-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "收藏小屋", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "work/screenshots/collection-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "课程词库", exact: true }).click();
  await expect(page.locator(".entry-card")).toHaveCount(24);
  await page.getByLabel("查找课程词条").fill("冷蔵庫");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await expect(page.locator(".entry-card")).toContainText("れいぞうこ");
});
