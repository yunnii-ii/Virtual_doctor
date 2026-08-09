import { Audio } from "expo-av";

const GOOGLE_TTS_URL = "https://translate.google.com/translate_tts";
const MAX_CHARS_PER_CHUNK = 180;

let currentSound = null;
let isPlaying = false;
let chunkIndex = 0;
let chunks = [];
let langCode = "my";
let currentOnDone = null;
let currentOnError = null;
let currentOnStart = null;

const splitTextIntoChunks = (text) => {
  if (!text) return [];
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_CHARS_PER_CHUNK) return [clean];

  const result = [];
  let remaining = clean;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHARS_PER_CHUNK) {
      result.push(remaining);
      break;
    }

    let cutPoint = MAX_CHARS_PER_CHUNK;
    const punctuationRegex = /[။။\.။!?၊,;:\s]/;
    let found = -1;
    for (let i = MAX_CHARS_PER_CHUNK; i >= Math.floor(MAX_CHARS_PER_CHUNK * 0.6); i--) {
      if (punctuationRegex.test(remaining[i])) {
        found = i + 1;
        break;
      }
    }
    if (found > 0) cutPoint = found;

    result.push(remaining.substring(0, cutPoint).trim());
    remaining = remaining.substring(cutPoint).trim();
  }

  return result.filter((c) => c.length > 0);
};

const buildTtsUrl = (text, language) => {
  const encoded = encodeURIComponent(text);
  return `${GOOGLE_TTS_URL}?ie=UTF-8&q=${encoded}&tl=${language}&client=tw-ob`;
};

const unloadCurrentSound = async () => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
    } catch (e) {}
    try {
      await currentSound.unloadAsync();
    } catch (e) {}
    currentSound = null;
  }
};

const playChunk = async () => {
  if (!isPlaying || chunkIndex >= chunks.length) {
    isPlaying = false;
    if (currentOnDone && chunkIndex >= chunks.length) {
      const cb = currentOnDone;
      currentOnDone = null;
      cb();
    }
    return;
  }

  const text = chunks[chunkIndex];
  const url = buildTtsUrl(text, langCode);

  try {
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true },
      (status) => {
        if (status.error) {
          console.error("TTS playback error:", status.error);
          if (currentOnError) {
            const cb = currentOnError;
            currentOnError = null;
            cb(status.error);
          }
          isPlaying = false;
          return;
        }
        if (status.didJustFinish) {
          chunkIndex++;
          setTimeout(() => playChunk(), 150);
        }
      }
    );
    currentSound = sound;
  } catch (error) {
    console.error("TTS create sound error:", error);
    if (currentOnError) {
      const cb = currentOnError;
      currentOnError = null;
      cb(error);
    }
    isPlaying = false;
  }
};

export const setAudioModeForSpeech = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    console.error("setAudioMode error:", e);
  }
};

export const speak = async (text, options = {}) => {
  try {
    await stop();
  } catch (e) {}

  if (!text) {
    if (options.onDone) options.onDone();
    return;
  }

  langCode = options.language === "en-US" || options.language === "en" ? "en" : "my";
  chunks = splitTextIntoChunks(text);
  chunkIndex = 0;
  isPlaying = true;

  currentOnStart = options.onStart || null;
  currentOnDone = options.onDone || null;
  currentOnError = options.onError || null;

  if (currentOnStart) {
    currentOnStart();
  }

  await setAudioModeForSpeech();
  await playChunk();
};

export const stop = async () => {
  isPlaying = false;
  chunkIndex = 0;
  chunks = [];
  currentOnStart = null;
  currentOnDone = null;
  currentOnError = null;
  await unloadCurrentSound();
};

export const isSpeaking = () => isPlaying;
