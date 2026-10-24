import { expect, test } from "@playwright/test";

test("the May speaker sends ごがつ to the device voice", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: class {
        constructor(public text: string) {}
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          { lang: "ja-JP", voiceURI: "test-ja", name: "Test Japanese" },
        ],
        addEventListener() {},
        removeEventListener() {},
        cancel() {},
        speak(utterance: { text: string }) {
          document.documentElement.dataset.lastSpoken = utterance.text;
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "课程词库", exact: true }).click();
  await page.getByLabel("查找课程词条").fill("五月");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await page
    .locator(".entry-card")
    .getByRole("button", { name: "查看" })
    .click();
  await expect(page.getByRole("dialog")).toContainText("ごがつ");
  await page.getByRole("button", { name: "朗读词条" }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-last-spoken",
    "ごがつ",
  );
});
