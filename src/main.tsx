import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./expansion.css";
import { registerSW } from "virtual:pwa-register";
import { isNative, installExternalLinkHandler } from "./lib/platform";
import { initializeNativeAudio } from "./lib/audio";

installExternalLinkHandler();
void initializeNativeAudio();
if (!isNative)
  registerSW({
    onOfflineReady() {
      window.dispatchEvent(new Event("kana-offline-ready"));
    },
    onNeedRefresh() {
      window.dispatchEvent(new Event("kana-update-ready"));
    },
  });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
