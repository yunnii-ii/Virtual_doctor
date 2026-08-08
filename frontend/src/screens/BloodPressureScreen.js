import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Card,
  Button,
  TextInput,
  List,
  IconButton,
  useTheme,
} from "react-native-paper";
import { Activity, Plus, Trash2, Heart } from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useTranslation } from "react-i18next";
import { useAuth } from "../utils/AuthContext";
import { saveToHistory } from "../utils/storage";
import { saveHistoryToDB } from "../api";

const BloodPressureScreen = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const stored = await AsyncStorage.getItem("bp_logs");
      if (stored) setLogs(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const saveLogs = async (newLogs) => {
    try {
      await AsyncStorage.setItem("bp_logs", JSON.stringify(newLogs));
      setLogs(newLogs);
    } catch (e) {
      console.error(e);
    }
  };

  const addLog = async () => {
    if (!systolic || !diastolic) return;
    const newLog = {
      id: Date.now().toString(),
      systolic,
      diastolic,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const updated = [newLog, ...logs];
    await saveLogs(updated);
    setSystolic("");
    setDiastolic("");

    try {
      const details = `BP: ${systolic}/${diastolic} mmHg`;
      await saveToHistory({
        type: "Blood Pressure",
        title: "Blood Pressure Reading",
        details,
      });
      if (user && user.id) {
        await saveHistoryToDB(
          "Blood Pressure",
          "Blood Pressure Reading",
          details,
          user.id,
        );
      }
    } catch (error) {
      console.error("Error saving blood pressure history:", error);
    }
  };

  const deleteLog = (id) => {
    const updated = logs.filter((l) => l.id !== id);
    saveLogs(updated);
  };

  const getStatus = (sys, dia) => {
    if (sys > 140 || dia > 90) return { label: t("high_bp"), color: "#FF6B6B" };
    if (sys < 90 || dia < 60) return { label: t("low_bp"), color: "#5568FF" };
    return { label: t("normal_bp"), color: "#10B981" };
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.inputCard}>
        <Card.Content>
          <View style={styles.row}>
            <TextInput
              label={t("systolic")}
              value={systolic}
              onChangeText={setSystolic}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              placeholder="120"
            />
            <Text style={styles.separator}>/</Text>
            <TextInput
              label={t("diastolic")}
              value={diastolic}
              onChangeText={setDiastolic}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              placeholder="80"
            />
          </View>
          <Button mode="contained" onPress={addLog} style={styles.addBtn}>
            {t("save_log")}
          </Button>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.historyTitle}>
        {t("history")}
      </Text>

      {logs.map((log) => {
        const status = getStatus(log.systolic, log.diastolic);
        return (
          <Card key={log.id} style={styles.logCard}>
            <Card.Content style={styles.logContent}>
              <View style={styles.logLeft}>
                <Heart size={24} color={status.color} />
                <View style={styles.logTextWrap}>
                  <Text variant="titleLarge" style={styles.bpValue}>
                    {log.systolic}/{log.diastolic}{" "}
                    <Text variant="bodySmall">mmHg</Text>
                  </Text>
                  <Text variant="bodySmall">
                    {log.date} at {log.time}
                  </Text>
                </View>
              </View>
              <View style={styles.logRight}>
                <Text style={[styles.statusTag, { color: status.color }]}>
                  {status.label}
                </Text>
                <IconButton
                  icon={() => <Trash2 size={20} color="#B0B5C0" />}
                  onPress={() => deleteLog(log.id)}
                />
              </View>
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FF" },
  content: { padding: 16 },
  inputCard: { borderRadius: 16, marginBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: { flex: 1 },
  separator: { fontSize: 24, paddingHorizontal: 12, marginTop: 6 },
  addBtn: { marginTop: 16, borderRadius: 8, backgroundColor: "#5568FF" },
  historyTitle: { marginBottom: 12, color: "#8A8FA3" },
  logCard: { marginBottom: 10, borderRadius: 12 },
  logContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logLeft: { flexDirection: "row", alignItems: "center" },
  logTextWrap: { marginLeft: 16 },
  bpValue: { fontWeight: "bold" },
  logRight: { alignItems: "flex-end" },
  statusTag: { fontSize: 12, fontWeight: "bold" },
});

export default BloodPressureScreen;
