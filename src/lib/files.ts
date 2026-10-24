import { isAndroid, isDesktop } from "./platform";

export async function downloadData(data: unknown, name: string): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  if (isAndroid) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({
      title: "ことばの島 · 学习备份",
      files: [uri],
      dialogTitle: "保存或分享学习备份",
    });
    return;
  }
  if (isDesktop) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import("@tauri-apps/plugin-dialog"),
      import("@tauri-apps/plugin-fs"),
    ]);
    const path = await save({
      defaultPath: name,
      filters: [{ name: "学习备份", extensions: ["json"] }],
    });
    if (path) await writeTextFile(path, content);
    return;
  }
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
