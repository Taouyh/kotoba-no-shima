import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadData } from "./files";

const platform = vi.hoisted(() => ({ isAndroid: false, isDesktop: false }));
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  writeTextFile: vi.fn(),
  writeFile: vi.fn(),
  share: vi.fn(),
}));
vi.mock("./platform", () => platform);
vi.mock("@tauri-apps/plugin-dialog", () => ({ save: mocks.save }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  writeTextFile: mocks.writeTextFile,
}));
vi.mock("@capacitor/filesystem", () => ({
  Filesystem: { writeFile: mocks.writeFile },
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
}));
vi.mock("@capacitor/share", () => ({ Share: { share: mocks.share } }));

beforeEach(() => {
  vi.clearAllMocks();
  platform.isAndroid = false;
  platform.isDesktop = false;
});

describe("native learning backup export", () => {
  it("writes the player's JSON only to the Windows save-dialog selection", async () => {
    platform.isDesktop = true;
    mocks.save.mockResolvedValue("chosen-backup.json");
    await downloadData({ attempts: [], favorites: ["h-が"] }, "backup.json");
    expect(mocks.save).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: "backup.json" }),
    );
    expect(mocks.writeTextFile).toHaveBeenCalledWith(
      "chosen-backup.json",
      JSON.stringify({ attempts: [], favorites: ["h-が"] }, null, 2),
    );
  });
  it("does not write anything if the Windows save dialog is cancelled", async () => {
    platform.isDesktop = true;
    mocks.save.mockResolvedValue(null);
    await downloadData({ attempts: [] }, "backup.json");
    expect(mocks.writeTextFile).not.toHaveBeenCalled();
  });
  it("shares the Android file URI after writing UTF-8 JSON to private cache", async () => {
    platform.isAndroid = true;
    mocks.writeFile.mockResolvedValue({ uri: "file:///cache/backup.json" });
    await downloadData({ favorites: ["kanji-五"] }, "backup.json");
    expect(mocks.writeFile).toHaveBeenCalledWith({
      path: "backup.json",
      directory: "CACHE",
      encoding: "utf8",
      data: JSON.stringify({ favorites: ["kanji-五"] }, null, 2),
    });
    expect(mocks.share).toHaveBeenCalledWith(
      expect.objectContaining({ files: ["file:///cache/backup.json"] }),
    );
  });
});
