import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import {
  Text,
  Card,
  Button,
  TextInput,
  IconButton,
  FAB,
  Portal,
  Modal,
  Divider,
  Surface,
} from "react-native-paper";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Trash2,
  Bell,
  BellOff,
  FileText,
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
import DateTimePicker from "@react-native-community/datetimepicker";
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
    shouldSetBadge: true,
  }),
});

const AppointmentScreen = () => {
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === "mm";
  const [appointments, setAppointments] = useState([]);
  const [visible, setVisible] = useState(false);
  const [soundModalVisible, setSoundModalVisible] = useState(false);

  // Form fields
  const [doctor, setDoctor] = useState("");
  const [appointDate, setAppointDate] = useState(new Date());
  const [appointTime, setAppointTime] = useState(new Date());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Ringtone config
  const [ringtoneConfig, setRingtoneConfig] = useState({
    type: "default",
    name: "Standard Digital Alarm",
    uri: null,
  });
  const [previewingId, setPreviewingId] = useState(null);

  useEffect(() => {
    loadAppointments();
    loadRingtoneConfig();
    setupNotificationChannel();

    return () => {
      stopAlarmRingtone();
    };
  }, []);

  const loadRingtoneConfig = async () => {
    const cfg = await getSavedRingtoneConfig();
    setRingtoneConfig(cfg);
  };

  const setupNotificationChannel = async () => {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("appointments", {
          name: "Appointment Reminders (Phone Ringtone)",
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
        const { status: existing } = await Notifications.getPermissionsAsync();
        if (existing !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
      }
    } catch (e) {
      console.log("Notification setup error:", e);
    }
  };

  const loadAppointments = async () => {
    try {
      const stored = await AsyncStorage.getItem("appointments_v2");
      if (stored) {
        setAppointments(JSON.parse(stored));
      } else {
        const old = await AsyncStorage.getItem("appointments");
        if (old) {
          const migrated = JSON.parse(old).map((a) => ({
            ...a,
            notifId1d: null,
            notifId1h: null,
            alarmOn: false,
            rawDateTime: null,
          }));
          saveAppointments(migrated);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveAppointments = async (newApps) => {
    try {
      await AsyncStorage.setItem("appointments_v2", JSON.stringify(newApps));
      setAppointments(newApps);
    } catch (e) {
      console.error(e);
    }
  };

  // ---- Schedule two notifications: 1 day before + 1 hour before ----
  const scheduleAlarms = async (doctorName, dateTime) => {
    const timeStr = dateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const schedule = async (triggerDate, bodyKey) => {
      if (triggerDate <= new Date()) return null; // already past
      try {
        return await Notifications.scheduleNotificationAsync({
          content: {
            title: t("appt_alarm_title"),
            body: t(bodyKey)
              .replace("{{doctor}}", doctorName)
              .replace("{{time}}", timeStr),
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 250, 500, 250, 500],
            ...(Platform.OS === "android" && { channelId: "appointments" }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            ...(Platform.OS === "android" && { channelId: "appointments" }),
          },
        });
      } catch (e) {
        console.log("Schedule failed:", e);
        return null;
      }
    };

    const oneDayBefore = new Date(dateTime.getTime() - 24 * 60 * 60 * 1000);
    const oneHourBefore = new Date(dateTime.getTime() - 60 * 60 * 1000);

    const id1d = await schedule(oneDayBefore, "appt_alarm_body_1d");
    const id1h = await schedule(oneHourBefore, "appt_alarm_body_1h");
    return { id1d, id1h };
  };

  const cancelAlarms = async (app) => {
    try {
      if (app.notifId1d) await Notifications.cancelScheduledNotificationAsync(app.notifId1d);
      if (app.notifId1h) await Notifications.cancelScheduledNotificationAsync(app.notifId1h);
    } catch (e) {}
  };

  // ---- Add ----
  const addAppointment = async () => {
    if (!doctor.trim()) return;

    const combined = new Date(appointDate);
    combined.setHours(appointTime.getHours(), appointTime.getMinutes(), 0, 0);

    const { id1d, id1h } = await scheduleAlarms(doctor, combined);

    const newApp = {
      id: Date.now().toString(),
      doctor: doctor.trim(),
      date: combined.toLocaleDateString(),
      time: combined.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      location: location.trim(),
      notes: notes.trim(),
      rawDateTime: combined.toISOString(),
      notifId1d: id1d,
      notifId1h: id1h,
      alarmOn: !!(id1d || id1h),
    };

    saveAppointments([...appointments, newApp]);
    // Reset
    setDoctor(""); setLocation(""); setNotes("");
    setAppointDate(new Date()); setAppointTime(new Date());
    setVisible(false);

    if (newApp.alarmOn) {
      const msgs = [];
      if (id1d) msgs.push(t("appt_alarm_1day"));
      if (id1h) msgs.push(t("appt_alarm_1hr"));
      Alert.alert("🔔", msgs.join("\n"));
    }
  };

  // ---- Toggle alarm on existing appointment ----
  const toggleAlarm = async (app) => {
    if (app.alarmOn) {
      await cancelAlarms(app);
      const updated = appointments.map((a) =>
        a.id === app.id
          ? { ...a, alarmOn: false, notifId1d: null, notifId1h: null }
          : a
      );
      saveAppointments(updated);
    } else {
      let dt = app.rawDateTime ? new Date(app.rawDateTime) : null;
      if (!dt || isNaN(dt.getTime())) {
        dt = new Date();
        dt.setDate(dt.getDate() + 1);
      }
      const { id1d, id1h } = await scheduleAlarms(app.doctor, dt);
      if (id1d || id1h) {
        const updated = appointments.map((a) =>
          a.id === app.id
            ? { ...a, alarmOn: true, notifId1d: id1d, notifId1h: id1h }
            : a
        );
        saveAppointments(updated);
        const msgs = [];
        if (id1d) msgs.push(t("appt_alarm_1day"));
        if (id1h) msgs.push(t("appt_alarm_1hr"));
        Alert.alert("🔔", msgs.join("\n"));
      } else {
        Alert.alert(t("warning"), "Could not schedule alarm (date may have passed).");
      }
    }
  };

  // ---- Delete ----
  const deleteAppointment = async (app) => {
    await cancelAlarms(app);
    saveAppointments(appointments.filter((a) => a.id !== app.id));
  };

  const confirmDelete = (app) => {
    Alert.alert(
      t("delete") || "ဖျက်မည်",
      `${app.doctor} - ${t("delete_appointment_confirm") || "ဤဆေးခန်းချိန်းဆိုမှုကို ဖျက်ရန် သေချာပါသလား?"}`,
      [
        { text: t("cancel") || "မလုပ်တော့ပါ", style: "cancel" },
        {
          text: t("delete") || "ဖျက်မည်",
          style: "destructive",
          onPress: () => deleteAppointment(app),
        },
      ]
    );
  };

  const onDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (selected) setAppointDate(selected);
  };

  const onTimeChange = (event, selected) => {
    setShowTimePicker(false);
    if (selected) setAppointTime(selected);
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Active Ringtone Bar ── */}
        <Surface style={styles.ringtoneCard} elevation={2}>
          <View style={styles.ringtoneLeft}>
            <View style={styles.musicIconCircle}>
              <Music size={20} color="#5568FF" />
            </View>
            <View style={styles.ringtoneTextWrap}>
              <Text style={styles.ringtoneLabel}>
                {isMM ? "ချိန်းဆိုမှု Alarm အသံ :" : "Appointment Alarm Sound :"}
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

        {/* ── Appointments List ── */}
        {appointments.length === 0 ? (
          <View style={styles.empty}>
            <Calendar size={64} color="#CCC" />
            <Text style={styles.emptyText}>{t("no_appointments")}</Text>
          </View>
        ) : (
          appointments.map((app) => (
            <Card key={app.id} style={[styles.card, app.alarmOn && styles.cardAlarm]}>
              <Card.Content>
                {/* Top header row with flex doctor info and visible actions */}
                <View style={styles.cardHeader}>
                  <View style={styles.doctorInfo}>
                    <View style={styles.doctorIconBox}>
                      <User size={17} color="#5568FF" />
                    </View>
                    <Text style={styles.doctorName} numberOfLines={1} ellipsizeMode="tail">
                      {app.doctor}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => toggleAlarm(app)}
                      style={[
                        styles.alarmBtn,
                        app.alarmOn ? styles.alarmBtnActive : styles.alarmBtnOff,
                      ]}
                      activeOpacity={0.7}
                    >
                      {app.alarmOn ? (
                        <Bell size={16} color="#5568FF" />
                      ) : (
                        <BellOff size={16} color="#94A3B8" />
                      )}
                      <Text
                        style={[
                          styles.alarmBtnText,
                          app.alarmOn ? styles.alarmBtnTextActive : styles.alarmBtnTextOff,
                        ]}
                      >
                        {app.alarmOn ? (t("alarm_on") || "Alarm ON") : (t("alarm_off") || "Alarm OFF")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => confirmDelete(app)}
                      style={styles.trashBtn}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                </View>

                {app.alarmOn && (
                  <View style={styles.alarmBadge}>
                    <Bell size={12} color="#5568FF" />
                    <Text style={styles.alarmBadgeText}>
                      {t("appt_alarm_badge") || (isMM ? "၁ ရက် နှင့် ၁ နာရီ ကြိုတင် သတိပေးမည်" : "Alarm: 1 day & 1 hr before")}
                    </Text>
                  </View>
                )}

                <Divider style={styles.divider} />

                {/* Date & Time */}
                <View style={styles.row}>
                  <Calendar size={15} color="#5568FF" />
                  <Text style={styles.rowText}>{app.date}</Text>
                  <Clock size={15} color="#5568FF" style={{ marginLeft: 14 }} />
                  <Text style={styles.rowText}>{app.time}</Text>
                </View>

                {/* Location */}
                {app.location ? (
                  <View style={styles.row}>
                    <MapPin size={15} color="#E056FD" />
                    <Text style={styles.rowText}>{app.location}</Text>
                  </View>
                ) : null}

                {/* Notes */}
                {app.notes ? (
                  <View style={styles.row}>
                    <FileText size={15} color="#686DE0" />
                    <Text style={styles.rowText}>{app.notes}</Text>
                  </View>
                ) : null}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: "#5568FF" }]}
        color="#FFF"
        onPress={() => setVisible(true)}
      />

      {/* ── Add Modal ── */}
      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {t("add_appointment")}
          </Text>

          <TextInput
            label={t("doctor_name")}
            value={doctor}
            onChangeText={setDoctor}
            mode="outlined"
            style={styles.input}
            placeholder="Dr. Kyaw Kyaw"
          />

          {/* Date Picker Button */}
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color="#5568FF" />
            <Text style={styles.pickerBtnText}>
              {appointDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={appointDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          {/* Time Picker Button */}
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowTimePicker(true)}
          >
            <Clock size={20} color="#5568FF" />
            <Text style={styles.pickerBtnText}>
              {appointTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={appointTime}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          <TextInput
            label={t("location")}
            value={location}
            onChangeText={setLocation}
            mode="outlined"
            style={styles.input}
            placeholder="Yangon General Hospital"
          />

          <TextInput
            label={t("notes")}
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            style={styles.input}
            placeholder="Bring previous lab results"
            multiline
            numberOfLines={2}
          />

          <View style={styles.modalButtons}>
            <Button onPress={() => setVisible(false)} textColor="#666">
              {t("cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={addAppointment}
              style={styles.saveBtn}
              buttonColor="#5568FF"
            >
              {t("save")}
            </Button>
          </View>
        </Modal>

        {/* ── Custom Ringtone Picker Modal ── */}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 80 },

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

  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyText: { marginTop: 16, fontSize: 16, color: "#64748B" },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#FFF",
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardAlarm: {
    borderColor: "#5568FF",
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  doctorIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    flexShrink: 1,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alarmBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  alarmBtnActive: { backgroundColor: "#EEF2FF" },
  alarmBtnOff: { backgroundColor: "#F1F5F9" },
  alarmBtnText: { fontSize: 11, fontWeight: "600" },
  alarmBtnTextActive: { color: "#5568FF" },
  alarmBtnTextOff: { color: "#94A3B8" },
  trashBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#FFF1F2",
  },
  alarmBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  alarmBadgeText: { fontSize: 11, color: "#5568FF", fontWeight: "600" },
  divider: { marginVertical: 8 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  rowText: { marginLeft: 8, fontSize: 13, color: "#475569", flex: 1 },
  fab: {
    position: "absolute",
    margin: 20,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    elevation: 4,
  },
  modal: {
    backgroundColor: "white",
    padding: 24,
    margin: 20,
    borderRadius: 20,
    elevation: 5,
  },
  modalTitle: { marginBottom: 16, fontWeight: "bold", color: "#1E293B" },
  input: { marginBottom: 12, backgroundColor: "white" },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 8,
    marginBottom: 12,
    gap: 10,
  },
  pickerBtnText: { fontSize: 15, color: "#333" },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  saveBtn: { marginLeft: 12, borderRadius: 10 },

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

export default AppointmentScreen;
