import Dexie, { type EntityTable } from "dexie";
import { downloadData } from "./files";
import {
  emptyProgress,
  localDay,
  validateProgress,
  type Progress,
} from "./learning";

const db = new Dexie("kana-island") as Dexie & {
  snapshots: EntityTable<{ id: string; data: unknown }, "id">;
};
db.version(1).stores({ snapshots: "id" });
export async function loadProgress(): Promise<Progress> {
  const row = await db.snapshots.get("main");
  if (!row) return emptyProgress();
  const next = validateProgress(row.data);
  if (
    (row.data as { version: number })?.version === 1 &&
    !(await db.snapshots.get("before-v2"))
  ) {
    await db.snapshots.put({ id: "before-v2", data: row.data });
  }
  return next;
}
// Serialize writes so that fast answers cannot let an older snapshot overwrite a newer one.
let pending: Promise<unknown> = Promise.resolve();
export function saveProgress(data: Progress): Promise<unknown> {
  pending = pending
    .catch(() => {})
    .then(() => db.snapshots.put({ id: "main", data }));
  return pending;
}
export function exportProgress(progress: Progress) {
  return downloadData(progress, `kotoba-no-shima-${localDay(Date.now())}.json`);
}
export async function exportUpgradeBackup(): Promise<boolean> {
  const row = await db.snapshots.get("before-v2");
  if (!row) return false;
  await downloadData(row.data, "kotoba-no-shima-before-v2.json");
  return true;
}
export function removeUpgradeBackup(): Promise<unknown> {
  pending = pending
    .catch(() => {})
    .then(() => db.snapshots.delete("before-v2"));
  return pending;
}
