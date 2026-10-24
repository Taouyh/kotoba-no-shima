import { expect, test } from "@playwright/test";

test("new visitors get the Japanese app name and a fresh island", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("ことばの島");
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(await manifest.json()).toMatchObject({
    name: "ことばの島",
    short_name: "ことばの島",
    lang: "zh-CN",
  });
  await page.getByRole("button", { name: "记忆手帐", exact: true }).click();
  await expect(page.locator(".stat-card").first()).toContainText("0");
  await page.getByRole("button", { name: "收藏小屋", exact: true }).click();
  await expect(page.locator(".wallet")).toContainText("0");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("kana-island");
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("snapshots", "readonly");
        const item = tx.objectStore("snapshots").get("main");
        item.onsuccess = () => {
          const data = item.result.data;
          if (
            data.attempts.length ||
            data.sessions.length ||
            data.favorites.length ||
            Object.keys(data.memories).length ||
            data.garden.earned
          )
            reject(new Error("Unexpected seeded progress"));
        };
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
});
