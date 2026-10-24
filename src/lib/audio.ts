import { entryById } from "../data/catalog";
import { isAndroid } from "./platform";

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
    window.dispatchEvent(
      new CustomEvent("kana-audio-error", {
        detail: "未能启动系统朗读。请检查安卓的文字转语音设置和日语语音包。",
      }),
    );
  }
}

// Replace / supplement browser speech with reviewed, licensed recordings here.
// Paths are relative to the app base, so a GitHub Pages project subpath also works.
export const recordings: Record<string, string> = {};
export const getJapaneseVoices = () =>
  isAndroid
    ? nativeVoices.filter((voice) => /^ja(?:-|_)/i.test(voice.lang))
    : "speechSynthesis" in window
      ? speechSynthesis
          .getVoices()
          .filter((voice) => /^ja(?:-|_)/i.test(voice.lang))
      : [];
let activeAudio: HTMLAudioElement | undefined;
let audioContext: AudioContext | undefined;
export function stopAudio() {
  if (isAndroid && nativeSpeech) void nativeSpeech.stop().catch(() => {});
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  if (activeAudio) {
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
  if (recordings[itemId]) {
    activeAudio = new Audio(import.meta.env.BASE_URL + recordings[itemId]);
    activeAudio.onended = () => onEnd?.();
    activeAudio.onerror = () => {
      window.dispatchEvent(
        new CustomEvent("kana-audio-error", {
          detail: "这段录音暂时无法播放。",
        }),
      );
      onEnd?.();
    };
    void activeAudio.play().catch(() => {
      window.dispatchEvent(
        new CustomEvent("kana-audio-error", {
          detail: "音频播放失败，请再点一次播放。",
        }),
      );
      onEnd?.();
    });
    return true;
  }
  const voices = getJapaneseVoices();
  if (!voices.length) return false;
  const entry = entryById.get(itemId);
  // Isolated words need their lesson's reading: e.g. 五月 is ごがつ here,
  // and 一日 has separate entries for いちにち and ついたち.
  // Keep full sentences intact so the voice can recognize particles and context.
  const speechText =
    entry && (entry.kind === "kanji" || entry.kind === "word")
      ? entry.reading
      : text;
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
      .then(() => onEnd?.())
      .catch(() => {
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
  utterance.onend = () => onEnd?.();
  utterance.onerror = (event) => {
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
