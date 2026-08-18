import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput as RNTextInput,
} from "react-native";
import {
  Text,
  Card,
  Button,
  FAB,
  Portal,
  Modal,
  IconButton,
  Switch,
  Chip,
  useTheme,
  Surface,
} from "react-native-paper";
import {
  Clock,
  Plus,
  Trash2,
  Bell,
  Pill,
  X,
  Volume2,
  Music,
  Upload,
  Check,
  Play,
  Square,
  FileAudio,
} from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const QUICK_MEDICINE_PRESETS = [
  { label: "ပါရာစီတမော", en: "Paracetamol" },
  { label: "အမောက်စီဆလင်", en: "Amoxicillin" },
  { label: "စီထရီဇင်း", en: "Cetirizine" },
  { label: "အစာအိမ်ဆေး", en: "Omeprazole" },
  { label: "ဗီတာမင်စီ", en: "Vitamin C" },
  { label: "သွေးတိုးဆေး", en: "Amlodipine" },
  { label: "ဆီးချိုဆေး", en: "Metformin" },
  { label: "အကိုက်အခဲပျောက်ဆေး", en: "Ibuprofen" },
];

const MedicineAlarmScreen = () => {
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === "mm";
  const [alarms, setAlarms] = useState([]);
  const [visible, setVisible] = useState(false);
  const [soundModalVisible, setSoundModalVisible] = useState(false);
  const [medName, setMedName] = useState("");
  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [ringtoneConfig, setRingtoneConfig] = useState({
    type: "default",
    name: "Standard Digital Alarm",
    uri: null,
  });
  const [previewingId, setPreviewingId] = useState(null);

  useEffect(() => {
    loadAlarms();
    loadRingtoneConfig();
    registerForPushNotificationsAsync();

    return () => {
      stopAlarmRingtone();
    };
  }, []);

  const loadRingtoneConfig = async () => {
    const cfg = await getSavedRingtoneConfig();
    setRingtoneConfig(cfg);
  };

  const registerForPushNotificationsAsync = async () => {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("medicine_alarm", {
          name: "Medicine Alarm (Phone Ringtone)",
          importance: Notifications.AndroidImportance.MAX,
          sound: "default",
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
            flags: {
              enforceAudibility: true,
              requestHardwareAudioVideoSynchronization: false,
            },
          },
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 500],
          lightColor: "#5568FF",
          enableLights: true,
          enableVibrate: true,
          showBadge: true,
        });
      }

      if (Device.isDevice || !__DEV__) {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          Alert.alert(
            t("warning"),
            "Notification permissions are required to receive medicine alarms.",
          );
          return;
        }
      }
    } catch (error) {
      console.log("Notification initialization failed:", error);
    }
  };

  const loadAlarms = async () => {
    try {
      const stored = await AsyncStorage.getItem("medicine_alarms");
      if (stored) setAlarms(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const saveAlarms = async (newAlarms) => {
    try {
      await AsyncStorage.setItem("medicine_alarms", JSON.stringify(newAlarms));
      setAlarms(newAlarms);
    } catch (e) {
      console.error(e);
    }
  };

  const scheduleNotification = async (name, date) => {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: t("med_alarm"),
          body: `${t("medicine_name")}: ${name}`,
          sound: "default",
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 500, 250, 500, 250, 500],
          ...(Platform.OS === "android" && { channelId: "medicine_alarm" }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: date.getHours(),
          minute: date.getMinutes(),
          ...(Platform.OS === "android" && { channelId: "medicine_alarm" }),
        },
      });
      return id;
    } catch (error) {
      console.log("Failed to schedule notification:", error);
      return null;
    }
  };

  const addAlarm = async () => {
    if (!medName || !medName.trim()) {
      Alert.alert(t("error"), t("please_enter_med_name"));
      return;
    }

    const trimmedName = medName.trim();
    const notificationId = await scheduleNotification(trimmedName, time);

    const newAlarm = {
      id: Date.now().toString(),
      notificationId,
      name: trimmedName,
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      rawTime: time.toISOString(),
      enabled: true,
    };

    const updated = [...alarms, newAlarm];
    saveAlarms(updated);
    setMedName("");
    setVisible(false);
  };

  const deleteAlarm = async (id) => {
    try {
      const alarm = alarms.find((a) => a.id === id);
      if (alarm?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(
          alarm.notificationId,
        );
      }
    } catch (e) {
      console.log("Failed to cancel notification:", e);
    }
    const updated = alarms.filter((a) => a.id !== id);
    saveAlarms(updated);
  };

  const toggleAlarm = async (id) => {
    const updated = await Promise.all(
      alarms.map(async (a) => {
        if (a.id === id) {
          if (a.enabled) {
            if (a.notificationId) {
              await Notifications.cancelScheduledNotificationAsync(
                a.notificationId,
              );
            }
            return { ...a, enabled: false, notificationId: null };
          } else {
            const newId = await scheduleNotification(
              a.name,
              new Date(a.rawTime),
            );
            return { ...a, enabled: true, notificationId: newId };
          }
        }
        return a;
      }),
    );
    saveAlarms(updated);
  };

  const onTimeChange = (event, selectedDate) => {
    setShowPicker(false);
    if (selectedDate) setTime(selectedDate);
  };

  // ── Custom Ringtone Selection Handlers ──
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Active Ringtone & Custom Upload Selector Bar ── */}
        <Surface style={styles.ringtoneCard} elevation={2}>
          <View style={styles.ringtoneLeft}>
            <View style={styles.musicIconCircle}>
              <Music size={20} color="#5568FF" />
            </View>
            <View style={styles.ringtoneTextWrap}>
              <Text style={styles.ringtoneLabel}>
                {isMM ? "လက်ရှိ Alarm အသံ :" : "Active Alarm Ringtone :"}
              </Text>
              <Text style={styles.ringtoneActiveName} numberOfLines={1}>
                {ringtoneConfig.type === "custom"
                  ? `🎵 ${ringtoneConfig.name}`
                  : `🔔 ${BUILTIN_RINGTONES[ringtoneConfig.type] ? (isMM ? BUILTIN_RINGTONES[ringtoneConfig.type].nameMM : BUILTIN_RINGTONES[ringtoneConfig.type].nameEN) : ringtoneConfig.name}`}
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

        {/* ── Alarms List ── */}
        {alarms.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color="#D0D5DD" />
            <Text style={styles.emptyText}>{t("no_alarms_yet")}</Text>
          </View>
        ) : (
          alarms.map((alarm) => (
            <Card key={alarm.id} style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.info}>
                  <Text
                    variant="titleLarge"
                    style={[styles.time, !alarm.enabled && styles.disabledText]}
                  >
                    {alarm.time}
                  </Text>
                  <View style={styles.medRow}>
                    <Pill
                      size={14}
                      color={alarm.enabled ? "#5568FF" : "#B0B5C0"}
                    />
                    <Text
                      style={[
                        styles.medName,
                        !alarm.enabled && styles.disabledText,
                      ]}
                    >
                      {alarm.name}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Switch
                    value={alarm.enabled}
                    onValueChange={() => toggleAlarm(alarm.id)}
                    color="#5568FF"
                  />
                  <IconButton
                    icon={() => <Trash2 size={20} color="#FF6B6B" />}
                    onPress={() => deleteAlarm(alarm.id)}
                  />
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: "#5568FF" }]}
        onPress={() => {
          setMedName("");
          setVisible(true);
        }}
        color="#FFF"
      />

      {/* ── Add New Alarm Modal ── */}
      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeaderRow}>
            <Text variant="titleLarge" style={styles.modalTitle}>
              {t("set_med_alarm") || (isMM ? "ဆေးသောက်ချိန် Alarm သတ်မှတ်မည်" : "Set Medicine Alarm")}
            </Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>{t("medicine_name") || (isMM ? "ဆေးအမည်" : "Medicine Name")}</Text>
          <View style={styles.inputBox}>
            <RNTextInput
              placeholder="ဥပမာ - ပါရာစီတမော"
              placeholderTextColor="#94A3B8"
              value={medName}
              onChangeText={setMedName}
              style={styles.nativeInput}
              autoCorrect={false}
              spellCheck={false}
            />
            {medName.length > 0 && (
              <TouchableOpacity onPress={() => setMedName("")}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.quickPresetTitle}>
            {isMM ? "အသုံးများသော ဆေးအမည်များ:" : "Quick Medicine Suggestions:"}
          </Text>
          <View style={styles.presetWrap}>
            {QUICK_MEDICINE_PRESETS.map((preset) => {
              const label = isMM ? preset.label : preset.en;
              const isSelected = medName === label;
              return (
                <TouchableOpacity
                  key={preset.en}
                  style={[
                    styles.presetChip,
                    isSelected && styles.presetChipActive,
                  ]}
                  onPress={() => setMedName(label)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      isSelected && styles.presetChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.timeSelector}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.8}
          >
            <Clock size={24} color="#5568FF" />
            <Text style={styles.timeText}>
              {time.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={time}
              mode="time"
              is24Hour={false}
              display="spinner"
              onChange={onTimeChange}
            />
          )}

          <View style={styles.modalButtons}>
            <Button
              onPress={() => setVisible(false)}
              textColor="#64748B"
              style={{ borderColor: "#CBD5E1", borderRadius: 10 }}
              mode="outlined"
            >
              {t("cancel") || (isMM ? "မလုပ်တော့ပါ" : "Cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={addAlarm}
              style={styles.addBtn}
              buttonColor="#5568FF"
              textColor="#FFFFFF"
            >
              {t("save") || (isMM ? "သိမ်းဆည်းမည်" : "Save")}
            </Button>
          </View>
        </Modal>

        {/* ── Custom Ringtone & Audio Upload Modal ── */}
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
                {isMM ? "Alarm အသံ ရွေးချယ်ရန်" : "Choose Alarm Ringtone"}
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
              : "Select a built-in alarm melody or upload your own audio file:"}
          </Text>

          {/* Built-in Ringtone Options */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },

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

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  card: {
    marginBottom: 12,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  info: {
    flex: 1,
  },
  time: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1E293B",
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  medName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5568FF",
  },
  disabledText: {
    color: "#CBD5E1",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fab: {
    position: "absolute",
    margin: 20,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    elevation: 4,
  },

  // Add Alarm Modal
  modal: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    margin: 20,
    borderRadius: 24,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontWeight: "bold",
    color: "#1E293B",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  nativeInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0F172A",
  },
  quickPresetTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#5568FF",
  },
  presetChipText: {
    fontSize: 11,
    color: "#334155",
  },
  presetChipTextActive: {
    color: "#5568FF",
    fontWeight: "bold",
  },
  timeSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  timeText: {
    marginLeft: 12,
    fontSize: 22,
    fontWeight: "bold",
    color: "#5568FF",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  addBtn: {
    borderRadius: 10,
    elevation: 2,
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

export default MedicineAlarmScreen;
