import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

await mkdir("work/audio-build", { recursive: true });
await build({
  entryPoints: ["scripts/audio-corpus.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "work/audio-build/corpus-export.cjs",
});
const json = execFileSync(
  process.execPath,
  ["work/audio-build/corpus-export.cjs"],
  { encoding: "utf8" },
);
await writeFile("work/audio-build/corpus.json", json);
const corpus = JSON.parse(json);
console.log(
  `${corpus.length} playback targets, ${new Set(corpus.map((item) => item.speech)).size} unique audio clips.`,
);
