import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Text, Card, IconButton, useTheme, Surface, Portal, Modal, Button } from "react-native-paper";
import {
  Droplet,
  Plus,
  Minus,
  Award,
  Bell,
  BellOff,
  Music,
  Volume2,
  Upload,
  Check,
  Play,
  Square,
  X,
} from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useTranslation } from "react-i18next";
import { useAuth } from "../utils/AuthContext";
import { saveToHistory } from "../utils/storage";
import { saveHistoryToDB } from "../api";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as DocumentPicker from "expo-document-picker";
import {
  BUILTIN_RINGTONES,
  getSavedRingtoneConfig,
  setSavedRingtoneConfig,
  playAlarmRingtone,
  stopAlarmRingtone,
} from "../utils/alarmSound";

// 250 ml per glass
const ML_PER_GLASS = 250;
const GOAL_GLASSES = 8; // 8 x 250ml = 2000ml = 2L
const GOAL_ML = GOAL_GLASSES * ML_PER_GLASS;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const WaterTrackerScreen = () => {
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === "mm";
  const { user } = useAuth();
  const [glassCount, setGlassCount] = useState(0);
  const [reminderOn, setReminderOn] = useState(false);
  const [reminderNotifId, setReminderNotifId] = useState(null);
  const [progress] = useState(new Animated.Value(0));
  const [soundModalVisible, setSoundModalVisible] = useState(false);
  const [ringtoneConfig, setRingtoneConfig] = useState({
    type: "water",
    name: "Refreshing Water Drop",
    uri: null,
  });
  const [previewingId, setPreviewingId] = useState(null);

  const goal = GOAL_GLASSES;

  useEffect(() => {
    loadAll();
    loadRingtoneConfig();

    return () => {
      stopAlarmRingtone();
    };
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.min(glassCount / goal, 1),
      duration: 500,
      useNativeDriver: false,
    }).start();
    saveProgress();
  }, [glassCount]);

  const loadRingtoneConfig = async () => {
    const cfg = await getSavedRingtoneConfig();
    setRingtoneConfig(cfg);
  };

  const loadAll = async () => {
    try {
      const today = new Date().toLocaleDateString();
      const stored = await AsyncStorage.getItem(`water_${today}`);
      if (stored) setGlassCount(parseInt(stored, 10));

      const rid = await AsyncStorage.getItem("water_reminder_id");
      if (rid) {
        setReminderNotifId(rid);
        setReminderOn(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveProgress = async () => {
    try {
      const today = new Date().toLocaleDateString();
      await AsyncStorage.setItem(`water_${today}`, glassCount.toString());
    } catch (e) {
      console.error(e);
    }
  };

  // ---- Add / Remove ----
  const addGlass = async () => {
    const newCount = glassCount + 1;
    setGlassCount(newCount);
    const details = isMM
      ? `ရေ ၁ ခွက် သောက်ခဲ့သည်၊ စုစုပေါင်း ${newCount}/${goal} ခွက်`
      : `Drank 1 glass, total ${newCount}/${goal}`;
    try {
      await saveToHistory({
        type: "Water",
        title: isMM ? "ရေသောက်မှတ်တမ်း" : "Water Intake",
        details,
      });
      if (user && user.id) {
        await saveHistoryToDB(
          "Water",
          isMM ? "ရေသောက်မှတ်တမ်း" : "Water Intake",
          details,
          user.id,
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeGlass = () => setGlassCount((prev) => Math.max(0, prev - 1));

  // ---- Reminder ----
  const requestPermissions = async () => {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("water_reminder", {
          name: "Water Reminder",
          importance: Notifications.AndroidImportance.HIGH,
          sound: "default",
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.NOTIFICATION_RINGTONE,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          },
          vibrationPattern: [0, 350, 200, 350],
          enableVibrate: true,
          showBadge: true,
        });
      }
      if (Device.isDevice || !__DEV__) {
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status !== "granted") return false;
        }
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const toggleReminder = async () => {
    if (reminderOn) {
      try {
        if (reminderNotifId) {
          await Notifications.cancelScheduledNotificationAsync(reminderNotifId);
        }
      } catch (e) {}
      await AsyncStorage.removeItem("water_reminder_id");
      setReminderNotifId(null);
      setReminderOn(false);
      Alert.alert("✅", t("water_reminder_cancel"));
      return;
    }

    const ok = await requestPermissions();
    if (!ok) {
      Alert.alert(t("warning"), "Notification permission required.");
      return;
    }

    const remindHours = [8, 10, 12, 14, 16, 18, 20];
    let firstId = null;
    for (const hour of remindHours) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: t("water_reminder_title"),
            body: t("water_reminder_body"),
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 350, 200, 350],
            ...(Platform.OS === "android" && { channelId: "water_reminder" }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute: 0,
            ...(Platform.OS === "android" && { channelId: "water_reminder" }),
          },
        });
        if (!firstId) firstId = id;
      } catch (e) {
        console.log("Could not schedule water reminder for hour", hour, e);
      }
    }

    if (firstId) {
      await AsyncStorage.setItem("water_reminder_id", firstId);
      setReminderNotifId(firstId);
      setReminderOn(true);
      Alert.alert("💧", t("water_reminder_set") + "\n(8am – 8pm, every 2h)");
    } else {
      Alert.alert(t("warning"), "Could not set reminder.");
    }
  };

  // ── Custom Ringtone Handlers ──
  const handleSelectBuiltin = async (type) => {
    const r = BUILTIN_RINGTONES[type];
    const newCfg = {
      type,
      name: isMM ? r.nameMM : r.nameEN,
      uri: null,
    };
    await setSavedRingtoneConfig(newCfg);
    setRingtoneConfig(newCfg);
  };

  const handleUploadCustomAudio = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const newCfg = {
          type: "custom",
          name: file.name || "Custom Ringtone",
          uri: file.uri,
        };
        await setSavedRingtoneConfig(newCfg);
        setRingtoneConfig(newCfg);
        Alert.alert(
          isMM ? "သတ်မှတ်ပြီးပါပြီ" : "Success",
          isMM
            ? `"${file.name}" ကို Alarm အသံအဖြစ် ရွေးချယ်ပြီးပါပြီ!`
            : `Set "${file.name}" as your active alarm ringtone!`
        );
      }
    } catch (e) {
      console.log("Error picking audio file:", e);
      Alert.alert(
        isMM ? "အမှား" : "Error",
        isMM ? "အသံဖိုင် ရွေးချယ်၍ မရပါ" : "Could not load selected audio file"
      );
    }
  };

  const handlePreviewTone = async (sourceId, customUri = null) => {
    if (previewingId === sourceId) {
      await stopAlarmRingtone();
      setPreviewingId(null);
    } else {
      setPreviewingId(sourceId);
      if (sourceId === "custom" && customUri) {
        await playAlarmRingtone(customUri);
      } else if (BUILTIN_RINGTONES[sourceId]) {
        await playAlarmRingtone(BUILTIN_RINGTONES[sourceId].source);
      } else {
        await playAlarmRingtone();
      }
    }
  };

  // ---- Computed values ----
  const mlDrunk = glassCount * ML_PER_GLASS;
  const mlRemaining = Math.max(0, GOAL_ML - mlDrunk);
  const litersDrunk = (mlDrunk / 1000).toFixed(2);
  const litersRemaining = (mlRemaining / 1000).toFixed(2);
  const isGoalMet = glassCount >= goal;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const fillColor = isGoalMet ? "#059669" : "#5568FF";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* ── Active Ringtone Selector Bar ── */}
      <Surface style={styles.ringtoneCard} elevation={2}>
        <View style={styles.ringtoneLeft}>
          <View style={styles.musicIconCircle}>
            <Music size={20} color="#5568FF" />
          </View>
          <View style={styles.ringtoneTextWrap}>
            <Text style={styles.ringtoneLabel}>
              {isMM ? "သတိပေးချက် Alarm အသံ :" : "Reminder Sound :"}
            </Text>
            <Text style={styles.ringtoneActiveName} numberOfLines={1}>
              {ringtoneConfig.type === "custom"
                ? `🎵 ${ringtoneConfig.name}`
                : `💧 ${BUILTIN_RINGTONES[ringtoneConfig.type] ? (isMM ? BUILTIN_RINGTONES[ringtoneConfig.type].nameMM : BUILTIN_RINGTONES[ringtoneConfig.type].nameEN) : ringtoneConfig.name}`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.changeRingtoneBtn}
          onPress={() => setSoundModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.changeRingtoneBtnText}>
            {isMM ? "အသံပြောင်းရန်" : "Change Sound"}
          </Text>
        </TouchableOpacity>
      </Surface>

      {/* Main card */}
      <Card style={styles.mainCard}>
        <Card.Content style={styles.center}>
          {/* Droplet icon */}
          <Droplet size={64} color={fillColor} fill={`${fillColor}30`} />

          {/* Glass count */}
          <Text variant="displayMedium" style={[styles.count, { color: fillColor }]}>
            {glassCount} / {goal}
          </Text>
          <Text variant="titleMedium" style={styles.unit}>
            {t("glasses_today") || (isMM ? "ဖန်ခွက် သောက်ပြီး" : "glasses drank")}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressWidth, backgroundColor: fillColor },
              ]}
            />
          </View>

          {/* Liter stats row */}
          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: fillColor }]}>{litersDrunk} L</Text>
              <Text style={styles.statLabel}>{t("drank") || (isMM ? "သောက်ပြီး" : "Drank")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{litersRemaining} L</Text>
              <Text style={styles.statLabel}>{t("remaining") || (isMM ? "သောက်ရန်ကျန်" : "Remaining")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{GOAL_ML / 1000} L</Text>
              <Text style={styles.statLabel}>{t("daily_goal") || (isMM ? "တစ်နေ့တာ ရည်မှန်းချက်" : "Daily Goal")}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Goal achieved banner */}
      {isGoalMet && (
        <Card style={styles.congratsCard}>
          <Card.Content style={styles.congratsContent}>
            <Award size={32} color="#059669" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text variant="titleMedium" style={styles.congratsTitle}>
                {t("goal_achieved") || (isMM ? "တစ်နေ့တာ ရည်မှန်းချက် ပြည့်မီပါပြီ!" : "Daily Goal Achieved!")}
              </Text>
              <Text variant="bodySmall" style={styles.congratsSubtitle}>
                {t("great_job_stay_hydrated") || (isMM ? "သာဓုပါ! ရေဓာတ်ပြည့်ဝစွာ ဆက်လက်ထိန်းသိမ်းပါ။" : "Great job! Keep staying hydrated.")}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, styles.minusBtn]}
          onPress={removeGlass}
          disabled={glassCount === 0}
          activeOpacity={0.8}
        >
          <Minus size={28} color={glassCount === 0 ? "#CBD5E1" : "#FF6B6B"} />
          <Text style={[styles.btnLabel, { color: glassCount === 0 ? "#CBD5E1" : "#FF6B6B" }]}>
            -250 ml
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.plusBtn]}
          onPress={addGlass}
          activeOpacity={0.8}
        >
          <Plus size={32} color="#FFF" />
          <Text style={[styles.btnLabel, { color: "#FFF", fontWeight: "bold" }]}>
            +250 ml
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reminder toggle card */}
      <Card style={styles.reminderCard}>
        <Card.Content style={styles.reminderContent}>
          <View style={styles.reminderLeft}>
            {reminderOn ? (
              <Bell size={24} color="#5568FF" />
            ) : (
              <BellOff size={24} color="#8A8FA3" />
            )}
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text variant="titleMedium" style={styles.reminderTitle}>
                {t("water_reminder") || (isMM ? "ရေသောက်ရန် သတိပေးချက်" : "Water Reminder")}
              </Text>
              <Text variant="bodySmall" style={styles.reminderSubtitle}>
                {reminderOn
                  ? (t("every_2_hours") || (isMM ? "၂ နာရီတစ်ကြိမ် သတိပေးမည်" : "Every 2 hours"))
                  : (t("reminder_off") || (isMM ? "သတိပေးချက် ပိတ်ထားသည်" : "Reminder is OFF"))}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.toggleBtn, reminderOn && styles.toggleBtnActive]}
            onPress={toggleReminder}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleBtnText, reminderOn && styles.toggleBtnTextActive]}>
              {reminderOn ? "ON" : "OFF"}
            </Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* ── Custom Ringtone Picker Modal ── */}
      <Portal>
        <Modal
          visible={soundModalVisible}
          onDismiss={async () => {
            await stopAlarmRingtone();
            setPreviewingId(null);
            setSoundModalVisible(false);
          }}
          contentContainerStyle={styles.soundModal}
        >
          <View style={styles.soundModalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Volume2 size={22} color="#5568FF" />
              <Text style={styles.soundModalTitle}>
                {isMM ? "သတိပေးချက် အသံ ရွေးချယ်ရန်" : "Choose Reminder Sound"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                await stopAlarmRingtone();
                setPreviewingId(null);
                setSoundModalVisible(false);
              }}
            >
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.soundModalSubtitle}>
            {isMM
              ? "ကြိုက်နှစ်သက်ရာ Alarm အသံ သို့မဟုတ် မိမိဖုန်းထဲမှ သီချင်း/အသံဖိုင်ကို ရွေးချယ်ပါ:"
              : "Select a built-in melody or upload your own audio file:"}
          </Text>

          {/* Built-in Options */}
          {Object.entries(BUILTIN_RINGTONES).map(([key, item]) => {
            const isSelected = ringtoneConfig.type === key;
            const isPlayingThis = previewingId === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.soundItemRow,
                  isSelected && styles.soundItemRowActive,
                ]}
                onPress={() => handleSelectBuiltin(key)}
                activeOpacity={0.7}
              >
                <View style={styles.soundItemLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      isSelected && styles.radioCircleActive,
                    ]}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Text
                    style={[
                      styles.soundItemName,
                      isSelected && styles.soundItemNameActive,
                    ]}
                  >
                    {isMM ? item.nameMM : item.nameEN}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.previewPlayBtn,
                    isPlayingThis && styles.previewPlayBtnActive,
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handlePreviewTone(key);
                  }}
                >
                  {isPlayingThis ? (
                    <Square size={14} color="#EF4444" fill="#EF4444" />
                  ) : (
                    <Play size={14} color="#5568FF" fill="#5568FF" />
                  )}
                  <Text
                    style={[
                      styles.previewPlayText,
                      isPlayingThis && { color: "#EF4444" },
                    ]}
                  >
                    {isPlayingThis ? "Stop" : "Play"}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

          {/* Custom Uploaded Ringtone Item if present */}
          {ringtoneConfig.type === "custom" && ringtoneConfig.uri && (
            <View style={[styles.soundItemRow, styles.soundItemRowActive]}>
              <View style={styles.soundItemLeft}>
                <View style={[styles.radioCircle, styles.radioCircleActive]}>
                  <Check size={14} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.soundItemNameActive} numberOfLines={1}>
                    🎵 {ringtoneConfig.name}
                  </Text>
                  <Text style={styles.customFileBadge}>
                    {isMM ? "ဖုန်းထဲမှ ရွေးထားသော အသံဖိုင်" : "Custom File Selected"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.previewPlayBtn,
                  previewingId === "custom" && styles.previewPlayBtnActive,
                ]}
                onPress={() => handlePreviewTone("custom", ringtoneConfig.uri)}
              >
                {previewingId === "custom" ? (
                  <Square size={14} color="#EF4444" fill="#EF4444" />
                ) : (
                  <Play size={14} color="#5568FF" fill="#5568FF" />
                )}
                <Text
                  style={[
                    styles.previewPlayText,
                    previewingId === "custom" && { color: "#EF4444" },
                  ]}
                >
                  {previewingId === "custom" ? "Stop" : "Play"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Upload Button */}
          <TouchableOpacity
            style={styles.uploadBtnBox}
            onPress={handleUploadCustomAudio}
            activeOpacity={0.8}
          >
            <Upload size={20} color="#5568FF" />
            <Text style={styles.uploadBtnText}>
              {isMM
                ? "📁 ဖုန်းထဲမှ သီချင်း/အသံဖိုင် တင်မည် (MP3 / WAV)"
                : "📁 Upload Custom Audio (MP3 / WAV)"}
            </Text>
          </TouchableOpacity>

          <Button
            mode="contained"
            buttonColor="#5568FF"
            textColor="#FFFFFF"
            style={styles.soundDoneBtn}
            labelStyle={{ fontWeight: "bold" }}
            onPress={async () => {
              await stopAlarmRingtone();
              setPreviewingId(null);
              setSoundModalVisible(false);
            }}
          >
            {isMM ? "ရွေးချယ်မှု အတည်ပြုသည်" : "Done"}
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 60 },

  // Ringtone Selector Bar
  ringtoneCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EEF2FF",
  },
  ringtoneLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  musicIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  ringtoneTextWrap: {
    flex: 1,
  },
  ringtoneLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  ringtoneActiveName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#5568FF",
    marginTop: 2,
  },
  changeRingtoneBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#5568FF",
  },
  changeRingtoneBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  mainCard: {
    borderRadius: 24,
    paddingVertical: 20,
    backgroundColor: "#FFF",
    elevation: 2,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  center: { alignItems: "center" },
  count: { fontWeight: "bold", marginVertical: 8 },
  unit: { color: "#64748B", marginBottom: 16 },
  progressBarBg: {
    width: "90%",
    height: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 8,
  },
  statBox: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  statLabel: { fontSize: 12, color: "#64748B", marginTop: 2 },
  statDivider: { width: 1, height: "80%", backgroundColor: "#E2E8F0" },
  congratsCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  congratsContent: { flexDirection: "row", alignItems: "center" },
  congratsTitle: { fontWeight: "bold", color: "#059669" },
  congratsSubtitle: { color: "#047857" },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  minusBtn: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#FECACA",
  },
  plusBtn: {
    backgroundColor: "#5568FF",
  },
  btnLabel: { fontSize: 15, marginTop: 4 },
  reminderCard: {
    borderRadius: 18,
    backgroundColor: "#FFF",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  reminderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  reminderTitle: { fontWeight: "bold", color: "#1E293B" },
  reminderSubtitle: { color: "#64748B", marginTop: 2 },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  toggleBtnActive: {
    backgroundColor: "#EEF2FF",
  },
  toggleBtnText: {
    fontWeight: "bold",
    color: "#64748B",
    fontSize: 13,
  },
  toggleBtnTextActive: {
    color: "#5568FF",
  },

  // Sound Picker Modal
  soundModal: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 24,
    borderRadius: 24,
    elevation: 10,
    maxHeight: "92%",
  },
  soundModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  soundModalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
  },
  soundModalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 14,
    lineHeight: 17,
  },
  soundItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  soundItemRowActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#5568FF",
  },
  soundItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleActive: {
    backgroundColor: "#5568FF",
    borderColor: "#5568FF",
  },
  soundItemName: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    flexShrink: 1,
    lineHeight: 18,
  },
  soundItemNameActive: {
    fontSize: 12.5,
    fontWeight: "bold",
    color: "#5568FF",
    flex: 1,
    flexShrink: 1,
    lineHeight: 18,
  },
  customFileBadge: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  previewPlayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexShrink: 0,
  },
  previewPlayBtnActive: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  previewPlayText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#5568FF",
  },
  uploadBtnBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#F0F4FF",
    borderWidth: 1.5,
    borderColor: "#5568FF",
    borderStyle: "dashed",
    marginTop: 6,
    marginBottom: 14,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#5568FF",
    flexShrink: 1,
    textAlign: "center",
  },
  soundDoneBtn: {
    borderRadius: 12,
    elevation: 2,
  },
});

export default WaterTrackerScreen;
