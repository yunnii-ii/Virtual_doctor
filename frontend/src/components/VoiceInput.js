import React, { useState } from "react";
import { Alert, View, StyleSheet } from "react-native";
import { Button, Text, ActivityIndicator } from "react-native-paper";
import { Audio } from "expo-av";
import { Mic } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { transcribeVoice } from "../api";
import { COLORS } from "../utils/theme";

const VoiceInput = ({ onTranscriptionComplete, placeholderText = "Press mic to speak" }) => {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(null);
  const [processing, setProcessing] = useState(false);

  const startVoiceRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t("voice_assistant_permission_needed"),
          t("voice_assistant_permission_needed")
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const nextRecording = new Audio.Recording();
      await nextRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await nextRecording.startAsync();

      setRecording(nextRecording);
    } catch (error) {
      Alert.alert(t("voice_assistant_recording_error"), error.message);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (!recording) return;

      setProcessing(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "voice.m4a",
        type: "audio/m4a",
      });

      const response = await transcribeVoice(formData);
      const detectedText = response.transcript || "";

      if (onTranscriptionComplete) {
        onTranscriptionComplete(detectedText);
      }
    } catch (error) {
      console.error("Voice input error:", error);
      Alert.alert(t("voice_assistant_whisper_error"), error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleVoiceButton = () => {
    if (recording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        onPress={handleVoiceButton}
        style={[
          styles.button,
          { backgroundColor: recording ? COLORS.primary : COLORS.voice },
        ]}
        icon={() => (
          processing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Mic size={20} color="#FFF" />
          )
        )}
      >
        {recording
          ? t("voice_assistant_stop_transcribe")
          : processing
          ? t("voice_assistant_transcribing")
          : placeholderText}
      </Button>
      {recording && (
        <Text style={styles.statusText}>{t("voice_assistant_listening")}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 12,
  },
  button: {
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  statusText: {
    marginTop: 8,
    color: COLORS.textSecondary,
  },
});

export default VoiceInput;
