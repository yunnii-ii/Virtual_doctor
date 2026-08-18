import { Audio } from "expo-av";
import AsyncStorage from "./asyncStorage";

let soundObject = null;
let isPlaying = false;

export const BUILTIN_RINGTONES = {
  default: {
    id: "default",
    nameMM: "ပုံမှန် ဒစ်ဂျစ်တယ် Alarm သံ",
    nameEN: "Standard Digital Alarm",
    source: require("../../assets/alarm_ringtone.wav"),
  },
  soft: {
    id: "soft",
    nameMM: "သာယာသော ခေါင်းလောင်းသံ",
    nameEN: "Soft Morning Chime",
    source: require("../../assets/soft_chime.wav"),
  },
  urgent: {
    id: "urgent",
    nameMM: "အရေးပေါ် အချက်ပေးသံ",
    nameEN: "Urgent Alert Beep",
    source: require("../../assets/urgent_beep.wav"),
  },
  water: {
    id: "water",
    nameMM: "ကြည်လင်သော ရေစက်သံ",
    nameEN: "Refreshing Water Drop",
    source: require("../../assets/water_drop.wav"),
  },
};

export const getSavedRingtoneConfig = async () => {
  try {
    const raw = await AsyncStorage.getItem("selected_alarm_ringtone");
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return { type: "default", name: "Standard Digital Alarm", uri: null };
};

export const setSavedRingtoneConfig = async (config) => {
  try {
    await AsyncStorage.setItem("selected_alarm_ringtone", JSON.stringify(config));
  } catch (e) {
    console.log("Error saving ringtone config:", e);
  }
};

export const playAlarmRingtone = async (customSource = null) => {
  try {
    if (soundObject) {
      try {
        await soundObject.stopAsync();
        await soundObject.unloadAsync();
      } catch (e) {}
      soundObject = null;
    }

    // Configure Audio Mode to play even in silent mode with full alarm volume
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      staysActiveInBackground: true,
      playThroughEarpieceAndroid: false,
    });

    let sourceToPlay = null;

    if (customSource) {
      if (typeof customSource === "string") {
        sourceToPlay = { uri: customSource };
      } else if (customSource.uri) {
        sourceToPlay = { uri: customSource.uri };
      } else {
        sourceToPlay = customSource;
      }
    } else {
      // Load user's saved ringtone preference
      const savedConfig = await getSavedRingtoneConfig();
      if (savedConfig.type === "custom" && savedConfig.uri) {
        sourceToPlay = { uri: savedConfig.uri };
      } else if (BUILTIN_RINGTONES[savedConfig.type]) {
        sourceToPlay = BUILTIN_RINGTONES[savedConfig.type].source;
      } else {
        sourceToPlay = BUILTIN_RINGTONES.default.source;
      }
    }

    const { sound } = await Audio.Sound.createAsync(
      sourceToPlay,
      {
        shouldPlay: true,
        isLooping: true,
        volume: 1.0,
      }
    );

    soundObject = sound;
    isPlaying = true;
    await soundObject.playAsync();
  } catch (error) {
    console.log("Failed to play alarm sound:", error);
  }
};

export const stopAlarmRingtone = async () => {
  try {
    if (soundObject) {
      await soundObject.stopAsync();
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.log("Error stopping alarm sound:", error);
  } finally {
    isPlaying = false;
  }
};

export const isAlarmRinging = () => isPlaying;
