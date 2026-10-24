import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.github.taouyh.kotobashima",
  appName: "ことばの島",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
