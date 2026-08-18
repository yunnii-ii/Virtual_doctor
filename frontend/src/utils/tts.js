import { Audio } from "expo-av";

const GOOGLE_TTS_URL = "https://translate.google.com/translate_tts";
const MAX_CHARS_PER_CHUNK = 100;

let currentSound = null;
let isPlaying = false;
let chunkIndex = 0;
let chunks = [];
let langCode = "my";
let currentOnDone = null;
let currentOnError = null;
let currentOnStart = null;

// Clean text to remove emojis and formatting symbols that disrupt TTS engines
const cleanTextForTts = (text) => {
  if (!text) return "";
  return text
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, " ")
    .replace(/[•\*\_\#\~\|\<\>\[\]\{\}\(\)\/\\@\^\&\+\=\`\$\%]/g, " ")
    .replace(/⚠️|🚨|💊|💡|📋|ℹ️|✅|⚡|🔍/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const splitTextIntoChunks = (text) => {
  const clean = cleanTextForTts(text);
  if (!clean) return [];
  if (clean.length <= MAX_CHARS_PER_CHUNK) return [clean];

  const result = [];
  let remaining = clean;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHARS_PER_CHUNK) {
      result.push(remaining);
      break;
    }

    let cutPoint = MAX_CHARS_PER_CHUNK;
    // Look for sentence/phrase breaks between 50 and 100 characters
    const punctuationRegex = /[။\.!?၊,\s]/;
    let found = -1;
    for (let i = MAX_CHARS_PER_CHUNK; i >= Math.floor(MAX_CHARS_PER_CHUNK * 0.5); i--) {
      if (punctuationRegex.test(remaining[i])) {
        found = i + 1;
        break;
      }
    }
    if (found > 0) cutPoint = found;

    const chunk = remaining.substring(0, cutPoint).trim();
    if (chunk.length > 0) {
      result.push(chunk);
    }
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
    await unloadCurrentSound();
    if (currentOnDone) {
      const cb = currentOnDone;
      currentOnDone = null;
      cb();
    }
    return;
  }

  const text = chunks[chunkIndex];
  const url = buildTtsUrl(text, langCode);

  try {
    await unloadCurrentSound();
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true, volume: 1.0 },
      (status) => {
        if (status.error) {
          console.error("TTS playback status error:", status.error);
          chunkIndex++;
          setTimeout(() => playChunk(), 60);
          return;
        }
        if (status.didJustFinish) {
          chunkIndex++;
          setTimeout(() => playChunk(), 60);
        }
      }
    );
    currentSound = sound;
  } catch (error) {
    console.error("TTS create sound error:", error);
    chunkIndex++;
    setTimeout(() => playChunk(), 60);
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
