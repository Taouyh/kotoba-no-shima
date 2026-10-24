import { Capacitor } from "@capacitor/core";

export const isAndroid = Capacitor.getPlatform() === "android";
export const isDesktop =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
export const isNative = isAndroid || isDesktop;

export function installExternalLinkHandler() {
  if (!isDesktop) return;
  document.addEventListener("click", (event) => {
    const anchor =
      event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (
      !(anchor instanceof HTMLAnchorElement) ||
      !anchor.href.startsWith("https://")
    )
      return;
    event.preventDefault();
    void import("@tauri-apps/plugin-opener")
      .then(({ openUrl }) => openUrl(anchor.href))
      .catch(() => {
        window.dispatchEvent(
          new CustomEvent("kana-audio-error", {
            detail: "无法打开链接，请在浏览器中访问学习资料。",
          }),
        );
      });
  });
}
