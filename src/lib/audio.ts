import audioManifest from "../data/audio-manifest.json";
import { isAndroid, isNative } from "./platform";
import { speechTextForItem } from "./speech-text";

export const BUNDLED_VOICE_URI = "kotoba:bundled-ja";
export const recordings: Record<string, string> = { ...audioManifest.files };
const bundledVoice: SpeechSynthesisVoice = {
  voiceURI: BUNDLED_VOICE_URI,
  name: "游戏内置日语音频",
  lang: "ja-JP",
  localService: true,
  default: true,
};

let nativeSpeech:
  typeof import("@capacitor-community/text-to-speech").TextToSpeech | undefined;
let nativeVoices: SpeechSynthesisVoice[] = [];

export async function initializeNativeAudio() {
  if (!isAndroid) return;
  try {
    const { TextToSpeech } =
      await import("@capacitor-community/text-to-speech");
    nativeSpeech = TextToSpeech;
    nativeVoices = (await TextToSpeech.getSupportedVoices()).voices;
    window.dispatchEvent(new Event("kana-voices-changed"));
  } catch {
    // System TTS is optional. Bundled clips remain available without it.
    nativeVoices = [];
    window.dispatchEvent(new Event("kana-voices-changed"));
  }
}

export const getJapaneseVoices = () =>
  isAndroid
    ? nativeVoices.filter((voice) => /^ja(?:-|_)/i.test(voice.lang))
    : "speechSynthesis" in window
      ? speechSynthesis
          .getVoices()
          .filter((voice) => /^ja(?:-|_)/i.test(voice.lang))
      : [];
export const getAvailableVoices = () => [bundledVoice, ...getJapaneseVoices()];
let activeAudio: HTMLAudioElement | undefined;
let audioContext: AudioContext | undefined;
let playbackId = 0;
export function stopAudio() {
  playbackId++;
  if (isAndroid && nativeSpeech) void nativeSpeech.stop().catch(() => {});
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio = undefined;
  }
}
export function playJapanese(
  text: string,
  itemId: string,
  voiceURI = "",
  onEnd?: () => void,
): boolean {
  stopAudio();
  const currentPlayback = playbackId;
  const voices = getJapaneseVoices();
  const recording = recordings[itemId];
  const selectedDevice = voices.find((voice) => voice.voiceURI === voiceURI);
  const playRecording = () => {
    const audio = new Audio(import.meta.env.BASE_URL + recording);
    activeAudio = audio;
    let finished = false;
    const finish = (message?: string) => {
      if (finished || currentPlayback !== playbackId) return;
      finished = true;
      if (message)
        window.dispatchEvent(
          new CustomEvent("kana-audio-error", {
            detail: message,
          }),
        );
      onEnd?.();
    };
    audio.onended = () => finish();
    audio.onerror = () =>
      finish("内置音频暂时无法读取，请更新游戏，或联网重新加载后再试。");
    void audio.play().catch(() => finish("音频未能播放，请再点一次播放按钮。"));
    if (!isNative && "caches" in window) {
      // Media requests may be partial (206). Cache a complete response so the
      // service worker can satisfy future offline range requests reliably.
      void (async () => {
        const cache = await caches.open("kotoba-audio-v1");
        if (await cache.match(audio.src)) return;
        const response = await fetch(audio.src);
        if (response.ok && response.status === 200)
          await cache.put(audio.src, response);
      })().catch(() => {});
    }
  };
  if (recording && !selectedDevice) {
    playRecording();
    return true;
  }
  if (!voices.length) return false;
  const speechText = speechTextForItem(text, itemId);
  if (isAndroid && nativeSpeech) {
    const chosenVoice =
      voices.find((v) => v.voiceURI === voiceURI) || voices[0];
    void nativeSpeech
      .speak({
        text: speechText,
        lang: "ja-JP",
        rate: 0.8,
        voice: nativeVoices.findIndex(
          (v) => v.voiceURI === chosenVoice.voiceURI,
        ),
        queueStrategy: 0,
      })
      .then(() => {
        if (currentPlayback === playbackId) onEnd?.();
      })
      .catch(() => {
        if (currentPlayback !== playbackId) return;
        if (recording) {
          playRecording();
          return;
        }
        window.dispatchEvent(
          new CustomEvent("kana-audio-error", {
            detail: "设备日语朗读不可用，请检查系统文字转语音的日语语音包。",
          }),
        );
        onEnd?.();
      });
    return true;
  }
  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.lang = "ja-JP";
  utterance.voice = voices.find((v) => v.voiceURI === voiceURI) || voices[0];
  utterance.rate = 0.8;
  utterance.onend = () => {
    if (currentPlayback === playbackId) onEnd?.();
  };
  utterance.onerror = (event) => {
    if (currentPlayback !== playbackId) return;
    if (
      event.error !== "canceled" &&
      event.error !== "interrupted" &&
      recording
    ) {
      playRecording();
      return;
    }
    if (event.error !== "canceled" && event.error !== "interrupted")
      window.dispatchEvent(
        new CustomEvent("kana-audio-error", {
          detail: "设备日语朗读不可用。仍可继续看字与拍感练习。",
        }),
      );
    onEnd?.();
  };
  speechSynthesis.speak(utterance);
  return true;
}
export async function playTones(tones: ("H" | "L")[]) {
  // These are illustrative musical tones, never presented as native speech.
  audioContext ??= new AudioContext();
  await audioContext.resume();
  const start = audioContext.currentTime + 0.04;
  tones.forEach((tone, i) => {
    const oscillator = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = tone === "H" ? 392 : 293.66;
    gain.gain.setValueAtTime(0, start + i * 0.42);
    gain.gain.linearRampToValueAtTime(0.12, start + i * 0.42 + 0.025);
    gain.gain.setValueAtTime(0.12, start + i * 0.42 + 0.29);
    gain.gain.linearRampToValueAtTime(0, start + i * 0.42 + 0.36);
    oscillator.connect(gain).connect(audioContext!.destination);
    oscillator.start(start + i * 0.42);
    oscillator.stop(start + i * 0.42 + 0.38);
  });
}
