import React, { useState, useEffect, useRef } from "react";
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
  FAB,
  Portal,
  Modal,
  TextInput,
  List,
  IconButton,
  Switch,
  useTheme,
} from "react-native-paper";
import { Clock, Plus, Trash2, Bell, BellOff, Pill } from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MedicineAlarmScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [alarms, setAlarms] = useState([]);
  const [visible, setVisible] = useState(false);
  const [medName, setMedName] = useState("");
  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    loadAlarms();
    registerForPushNotificationsAsync();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FFA07AFF",
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
      console.log(
        "Notification initialization failed. Note: SDK 53+ requires a Development Build for full Android support:",
        error,
      );
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
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: date.getHours(),
          minute: date.getMinutes(),
        },
      });
      return id;
    } catch (error) {
      console.log("Failed to schedule notification:", error);
      return null;
    }
  };

  const addAlarm = async () => {
    if (!medName) {
      Alert.alert(t("error"), t("please_enter_med_name"));
      return;
    }

    const notificationId = await scheduleNotification(medName, time);

    if (!notificationId && Device.isDevice) {
      Alert.alert(
        t("warning"),
        "Could not schedule real-time notification, but alarm is saved locally.",
      );
    }

    const newAlarm = {
      id: Date.now().toString(),
      notificationId,
      name: medName,
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
            // Turning off
            if (a.notificationId) {
              await Notifications.cancelScheduledNotificationAsync(
                a.notificationId,
              );
            }
            return { ...a, enabled: false, notificationId: null };
          } else {
            // Turning on
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
        onPress={() => setVisible(true)}
        color="#FFF"
      />

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {t("add_new_alarm")}
          </Text>
          <TextInput
            label={t("medicine_name")}
            value={medName}
            onChangeText={setMedName}
            mode="outlined"
            style={styles.input}
          />
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            style={styles.timeSelector}
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
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}

          <View style={styles.modalButtons}>
            <Button onPress={() => setVisible(false)}>{t("cancel")}</Button>
            <Button mode="contained" onPress={addAlarm} style={styles.addBtn}>
              {t("add")}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: "#B0B5C0",
    fontSize: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#FFF",
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  info: {
    flex: 1,
  },
  time: {
    fontWeight: "bold",
    fontSize: 28,
    color: "#5A5F73",
  },
  medRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  medName: {
    marginLeft: 6,
    color: "#8A8FA3",
    fontSize: 16,
  },
  disabledText: {
    color: "#D0D5DD",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    borderRadius: 28,
  },
  modal: {
    backgroundColor: "white",
    padding: 24,
    margin: 20,
    borderRadius: 20,
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: "bold",
  },
  input: {
    marginBottom: 20,
  },
  timeSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F3F4F8",
    borderRadius: 12,
    marginBottom: 24,
  },
  timeText: {
    marginLeft: 12,
    fontSize: 20,
    fontWeight: "bold",
    color: "#5568FF",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  addBtn: {
    marginLeft: 12,
    backgroundColor: "#5568FF",
  },
});

export default MedicineAlarmScreen;
