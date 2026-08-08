import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Audio } from "expo-av";
import * as Speech from "expo-speech";
import { Mic, Send, Volume2 } from "lucide-react-native";
import { COLORS, FONTS, SHADOWS } from "../utils/theme";
import { transcribeVoice } from "../api";

const VoiceAssistantScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const sampleCommands = [
    t("voice_assistant_sample_fever"),
    t("voice_assistant_sample_bp"),
    t("voice_assistant_sample_water"),
    t("voice_assistant_sample_hospitals"),
    t("voice_assistant_sample_daily_advice"),
  ];
  const [processing, setProcessing] = useState(false);
  const [recording, setRecording] = useState(null);
  const [command, setCommand] = useState(sampleCommands[0]);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");

  useEffect(() => {
    setReply(t("voice_assistant_welcome"));
  }, [t]);

  const normalizeCommandText = (text) => {
    return (text || "")
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:()"']/g, "")
      .replace(/\s+/g, " ");
  };

  const normalizeVoiceTranscript = (text) => {
    if (!text) return "";
    return text
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^transcript:\s*/i, "")
      .replace(/^you said\s*/i, "");
  };

  const containsAnyKeyword = (text, keywords) => {
    return keywords.some((keyword) => text.includes(keyword));
  };

  const buildOfflineCommandResult = (text) => {
    const normalized = normalizeCommandText(text);

    if (!normalized) {
      return { screen: null, reply: t("voice_assistant_empty_command") };
    }

    const hasHospitalIntent = containsAnyKeyword(normalized, [
      "hospital",
      "clinic",
      "doctor",
      "emergency",
      "ဆေးရုံ",
      "ဆေးခန်း",
      "ဒေါက်တာ",
      "အရေးပေါ်",
      "ဆေးရုံသွား",
      "ဆေးခန်းသွား",
      "ဆေးရုံရှာ",
    ]);

    const hasBloodPressureIntent = containsAnyKeyword(normalized, [
      "blood pressure",
      "bp",
      "သွေးတိုး",
      "သွေးပေါင်ချိန်",
      "သွေးပေါင်",
      "သွေးပေါင်ချိန်ပြ",
      "သွေးပေါင်ချိန်ကို",
    ]);

    const hasWaterIntent = containsAnyKeyword(normalized, [
      "water",
      "drink",
      "ရေ",
      "သောက်",
      "ရေသောက်",
      "ရေသောက်မယ်",
      "ရေသောက်တယ်",
      "ရေသောက်ဖို့",
    ]);

    const hasMedicineIntent = containsAnyKeyword(normalized, [
      "medicine",
      "drug",
      "med",
      "ဆေး",
      "ဆေးဝါး",
      "ဆေးအကြောင်း",
      "ဆေးအမည်",
    ]);

    const hasSymptomIntent = containsAnyKeyword(normalized, [
      "fever",
      "cough",
      "symptom",
      "ဖျား",
      "ချောင်းဆိုး",
      "အဖျား",
      "လက္ခဏာ",
      "မူး",
      "နာ",
      "အနာ",
      "အန်",
      "ဖျားနာ",
    ]);

    const hasPlanIntent = containsAnyKeyword(normalized, [
      "plan",
      "routine",
      "health plan",
      "advice",
      "အကြံပြု",
      "စီမံချက်",
      "ကျန်းမာရေးစီမံချက်",
      "နေ့စဉ်",
    ]);

    if (hasHospitalIntent) {
      return {
        screen: "NearbyHospitals",
        reply: t("voice_assistant_reply_hospitals"),
      };
    }

    if (hasBloodPressureIntent) {
      return {
        screen: "BloodPressure",
        reply: t("voice_assistant_reply_blood_pressure"),
      };
    }

    if (hasWaterIntent) {
      return {
        screen: "WaterTracker",
        reply: t("voice_assistant_reply_water"),
      };
    }

    if (hasMedicineIntent) {
      return {
        screen: "MedicineInfo",
        reply: t("voice_assistant_reply_medicine"),
      };
    }

    if (hasSymptomIntent) {
      return {
        screen: "ClinicalDecisionSupport",
        reply: t("voice_assistant_reply_symptoms"),
      };
    }

    if (hasPlanIntent) {
      return {
        screen: "PersonalizedIntervention",
        reply: t("voice_assistant_reply_default"),
      };
    }

    return {
      screen: "Home",
      reply: t("voice_assistant_unknown_command"),
    };
  };

  const speakAndNavigate = (commandResult) => {
    const nextReply =
      commandResult.reply || t("voice_assistant_command_completed");
    setReply(nextReply);
    Speech.speak(nextReply, { language: "my-MM" });
    if (commandResult.screen) {
      navigation.navigate(commandResult.screen);
    }
  };

  const handleCommand = (text = command) => {
    if (!text?.trim()) {
      Alert.alert(
        t("voice_assistant_command_error"),
        t("voice_assistant_empty_command"),
      );
      return;
    }

    setTranscript(text);
    setProcessing(true);

    const commandResult = buildOfflineCommandResult(text);
    speakAndNavigate(commandResult);
    setProcessing(false);
  };

  const startVoiceRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t("voice_assistant_permission_needed"),
          t("voice_assistant_permission_needed"),
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const nextRecording = new Audio.Recording();
      await nextRecording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await nextRecording.startAsync();

      setRecording(nextRecording);
      setProcessing(true);
      setReply(t("voice_assistant_listening"));
    } catch (error) {
      Alert.alert(t("voice_assistant_recording_error"), error.message);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (!recording) return;

      setReply(t("voice_assistant_transcribing"));
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
      const detectedText = normalizeVoiceTranscript(response.transcript || "");
      const fallbackText =
        detectedText || command || t("voice_assistant_sample_hospitals");
      setTranscript(fallbackText);
      setCommand(fallbackText);

      if (response.command) {
        speakAndNavigate(response.command);
      } else if (fallbackText) {
        handleCommand(fallbackText);
      } else {
        setReply(t("voice_assistant_command_completed"));
      }
    } catch (error) {
      const fallbackText = command || t("voice_assistant_sample_hospitals");
      setTranscript(fallbackText);
      setCommand(fallbackText);
      setReply(t("voice_assistant_fallback_to_selected"));
      handleCommand(fallbackText);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Mic size={34} color={COLORS.voice} />
            <View style={styles.titleText}>
              <Text variant="headlineSmall" style={styles.title}>
                {t("voice_assistant_screen_title")}
              </Text>
              <Text style={styles.subtitle}>
                {t("voice_assistant_screen_subtitle")}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.listenCard}>
        <Card.Content style={styles.center}>
          <View
            style={[styles.micCircle, processing && styles.micCircleActive]}
          >
            <Mic size={52} color={processing ? "#FFF" : COLORS.voice} />
          </View>
          <Text style={styles.callStatus}>
            {processing
              ? t("voice_assistant_listening")
              : t("voice_assistant_tap_to_speak")}
          </Text>
          <Button
            mode="contained"
            onPress={handleVoiceButton}
            style={styles.primaryButton}
          >
            {processing
              ? t("voice_assistant_stop_transcribe")
              : t("voice_assistant_start_input")}
          </Button>
          {t("voice_assistant_offline_notice") ? (
            <Text style={styles.helperText}>
              {t("voice_assistant_offline_notice")}
            </Text>
          ) : null}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("voice_assistant_try_command")}
          </Text>
          <View style={styles.chipWrap}>
            {sampleCommands.map((item) => (
              <Chip
                key={item}
                selected={command === item}
                onPress={() => {
                  setCommand(item);
                  handleCommand(item);
                }}
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {item}
              </Chip>
            ))}
          </View>
          <TextInput
            mode="outlined"
            label={t("voice_assistant_transcript_label")}
            value={command}
            onChangeText={setCommand}
            style={styles.input}
          />
          <Button
            mode="outlined"
            icon={() => <Send size={18} color={COLORS.voice} />}
            onPress={() => handleCommand(command)}
            style={styles.actionButton}
          >
            {t("voice_assistant_run_command")}
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionRow}>
            <Volume2 size={22} color={COLORS.voice} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("voice_assistant_reply_title")}
            </Text>
          </View>
          {!!transcript && (
            <Text style={styles.transcript}>
              {t("voice_assistant_transcript_prefix")} {transcript}
            </Text>
          )}
          <Text style={styles.bodyText}>{reply}</Text>
          {!transcript && t("voice_assistant_offline_notice") && (
            <Text style={styles.helperText}>
              {t("voice_assistant_offline_notice")}
            </Text>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  heroCard: {
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    marginBottom: 14,
    ...SHADOWS.small,
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  titleText: { flex: 1, marginLeft: 14 },
  title: { ...FONTS.bold, color: COLORS.textPrimary },
  subtitle: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
  listenCard: {
    borderRadius: 14,
    backgroundColor: "#F7F0FF",
    marginBottom: 14,
  },
  center: { alignItems: "center", paddingVertical: 24 },
  micCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.voice,
    backgroundColor: COLORS.surface,
  },
  micCircleActive: { backgroundColor: COLORS.voice },
  callStatus: { ...FONTS.bold, color: COLORS.textPrimary, marginTop: 12 },
  helperText: {
    ...FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 10,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: COLORS.voice,
  },
  card: { borderRadius: 12, backgroundColor: COLORS.surface, marginBottom: 12 },
  sectionTitle: { ...FONTS.bold, color: COLORS.textPrimary },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  chip: { marginRight: 8, marginBottom: 8 },
  chipText: FONTS.regular,
  input: { marginTop: 10, backgroundColor: COLORS.surface, ...FONTS.regular },
  actionButton: { marginTop: 10, borderRadius: 8 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  transcript: { ...FONTS.bold, color: COLORS.textPrimary, marginTop: 10 },
  bodyText: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 10 },
});

export default VoiceAssistantScreen;
