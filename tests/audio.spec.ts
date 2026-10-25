import { expect, test, type Page } from "@playwright/test";
import { kana } from "../src/data/curriculum";
import manifest from "../src/data/audio-manifest.json" with { type: "json" };

async function withoutDeviceVoices(page: Page) {
  await page.addInitScript(() => {
    speechSynthesis.getVoices = () => [];
    const NativeAudio = window.Audio;
    const clips: HTMLAudioElement[] = [];
    (window as unknown as { testClips: HTMLAudioElement[] }).testClips = clips;
    window.Audio = function (src?: string) {
      const audio = new NativeAudio(src);
      clips.push(audio);
      return audio;
    } as typeof Audio;
  });
}
const clipCount = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { testClips: HTMLAudioElement[] }).testClips.length,
  );
async function expectDecodedSound(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const audio = (
          window as unknown as { testClips: HTMLAudioElement[] }
        ).testClips.at(-1);
        return (
          !!audio && !audio.error && (audio.currentTime > 0.01 || audio.ended)
        );
      }),
    )
    .toBe(true);
}
async function openMay(page: Page) {
  await page.getByRole("button", { name: "课程词库", exact: true }).click();
  await page.getByLabel("查找课程词条").fill("五月");
  await page
    .locator(".entry-card")
    .getByRole("button", { name: "查看" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("ごがつ");
}

test("May audio decodes and plays without any Japanese system voices", async ({
  page,
}) => {
  await withoutDeviceVoices(page);
  await page.goto("/");
  await openMay(page);
  await page.getByRole("button", { name: "朗读词条" }).click();
  await expectDecodedSound(page);
  const source = await page.evaluate(
    () =>
      (window as unknown as { testClips: HTMLAudioElement[] }).testClips[0].src,
  );
  expect(source).toContain(manifest.files["kanji-五"]);
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("correct recall plays once, moving on stops it, and a wrong answer stays silent", async ({
  page,
}) => {
  await withoutDeviceVoices(page);
  await page.goto("/");
  await page.getByRole("button", { name: "开始今日冒险" }).click();
  await page.getByRole("button", { name: "准备好了，开始练习" }).click();
  expect(await clipCount(page)).toBe(0);
  const glyph = (await page.locator(".question-glyph").textContent())!.trim();
  const item = kana.find((entry) => entry.glyph === glyph)!;
  await page.getByLabel("输入罗马字读音").fill(item.reading);
  await page.getByLabel("输入罗马字读音").press("Enter");
  await expect(page.locator(".answer-feedback")).toContainText("答对了");
  expect(await clipCount(page)).toBe(1);
  await expectDecodedSound(page);
  const source = await page.evaluate(
    () =>
      (window as unknown as { testClips: HTMLAudioElement[] }).testClips[0].src,
  );
  expect(source).toContain((manifest.files as Record<string, string>)[item.id]);
  await page.getByRole("button", { name: "下一题", exact: true }).click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testClips: HTMLAudioElement[] }).testClips[0]
          .paused,
    ),
  ).toBe(true);
  await page.getByLabel("输入罗马字读音").fill("wrong");
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toContainText("重新认识一下");
  expect(await clipCount(page)).toBe(1);
  await page.getByRole("button", { name: "听参考读音" }).click();
  expect(await clipCount(page)).toBe(2);
});

test("automatic feedback can be disabled while manual playback remains available", async ({
  page,
}) => {
  await withoutDeviceVoices(page);
  await page.goto("/");
  await page.getByRole("button", { name: "小岛设置", exact: true }).click();
  await page.getByLabel("答对后自动播放读音").uncheck();
  await page.getByRole("button", { name: "学习地图", exact: true }).click();
  await page.getByRole("button", { name: "开始今日冒险" }).click();
  await page.getByRole("button", { name: "准备好了，开始练习" }).click();
  const glyph = (await page.locator(".question-glyph").textContent())!.trim();
  await page
    .getByLabel("输入罗马字读音")
    .fill(kana.find((entry) => entry.glyph === glyph)!.reading);
  await page.getByRole("button", { name: "确认", exact: true }).click();
  await expect(page.locator(".answer-feedback")).toContainText("答对了");
  expect(await clipCount(page)).toBe(0);
  await page.getByRole("button", { name: "听参考读音" }).click();
  await expectDecodedSound(page);
});

test("a played clip is cached and remains playable after going offline", async ({
  page,
  context,
}) => {
  await withoutDeviceVoices(page);
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await openMay(page);
  await page.getByRole("button", { name: "朗读词条" }).click();
  await expectDecodedSound(page);
  await expect
    .poll(() =>
      page.evaluate(async (file) => {
        const cache = await caches.open("kotoba-audio-v1");
        return !!(await cache.match(new URL(file, location.href).href));
      }, manifest.files["kanji-五"]),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await openMay(page);
  await page.getByRole("button", { name: "朗读词条" }).click();
  await expectDecodedSound(page);
});
