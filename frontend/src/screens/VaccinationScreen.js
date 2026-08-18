import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Text,
  Card,
  IconButton,
  FAB,
  Portal,
  Modal,
  TextInput,
  useTheme,
  Button,
} from "react-native-paper";
import {
  Shield,
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  Plus,
  Minus,
  Syringe,
} from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useTranslation } from "react-i18next";

const VaccinationScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [vaccines, setVaccines] = useState([]);
  const [visible, setVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTotalDoses, setNewTotalDoses] = useState("1");

  const defaultVaccines = [
    { id: "1", name: "BCG",               totalDoses: 1, dosesGiven: 0, lastDate: "" },
    { id: "2", name: "Hepatitis B",        totalDoses: 3, dosesGiven: 0, lastDate: "" },
    { id: "3", name: "Polio (OPV)",        totalDoses: 4, dosesGiven: 0, lastDate: "" },
    { id: "4", name: "DPT",               totalDoses: 3, dosesGiven: 0, lastDate: "" },
    { id: "5", name: "Measles & Rubella", totalDoses: 2, dosesGiven: 0, lastDate: "" },
    { id: "6", name: "COVID-19",           totalDoses: 2, dosesGiven: 0, lastDate: "" },
  ];

  useEffect(() => {
    loadVaccines();
  }, []);

  const loadVaccines = async () => {
    try {
      const stored = await AsyncStorage.getItem("user_vaccines_v2");
      if (stored) {
        setVaccines(JSON.parse(stored));
      } else {
        // Migrate old data or use defaults
        const oldStored = await AsyncStorage.getItem("user_vaccines");
        if (oldStored) {
          const old = JSON.parse(oldStored);
          const migrated = old.map((v) => ({
            id: v.id,
            name: v.name,
            totalDoses: 1,
            dosesGiven: v.done ? 1 : 0,
            lastDate: v.date || "",
          }));
          saveVaccines(migrated);
        } else {
          saveVaccines(defaultVaccines);
        }
      }
    } catch (e) {
      console.error(e);
      setVaccines(defaultVaccines);
    }
  };

  const saveVaccines = async (list) => {
    try {
      await AsyncStorage.setItem("user_vaccines_v2", JSON.stringify(list));
      setVaccines(list);
    } catch (e) {
      console.error(e);
    }
  };

  const incrementDose = (id) => {
    const updated = vaccines.map((v) => {
      if (v.id !== id) return v;
      if (v.dosesGiven >= v.totalDoses) return v; // already max
      return {
        ...v,
        dosesGiven: v.dosesGiven + 1,
        lastDate: new Date().toLocaleDateString(),
      };
    });
    saveVaccines(updated);
  };

  const decrementDose = (id) => {
    const updated = vaccines.map((v) => {
      if (v.id !== id) return v;
      if (v.dosesGiven <= 0) return v;
      const next = v.dosesGiven - 1;
      return {
        ...v,
        dosesGiven: next,
        lastDate: next === 0 ? "" : v.lastDate,
      };
    });
    saveVaccines(updated);
  };

  const addVaccine = () => {
    if (!newName.trim()) return;
    const total = parseInt(newTotalDoses, 10);
    if (!total || total < 1) {
      Alert.alert(t("error"), "Please enter a valid number of doses.");
      return;
    }
    const next = {
      id: Date.now().toString(),
      name: newName.trim(),
      totalDoses: total,
      dosesGiven: 0,
      lastDate: newDate || "",
    };
    saveVaccines([...vaccines, next]);
    setNewName("");
    setNewDate("");
    setNewTotalDoses("1");
    setVisible(false);
  };

  const deleteVaccine = (id) => {
    saveVaccines(vaccines.filter((v) => v.id !== id));
  };

  const completedCount = vaccines.filter((v) => v.dosesGiven >= v.totalDoses).length;
  const totalCount = vaccines.length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerCard}>
          <Shield size={48} color="#A8E6CF" />
          <Text variant="titleLarge" style={styles.headerTitle}>
            {t("vaccination_tracker")}
          </Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>
            {t("vaccination_desc")}
          </Text>
          {/* Summary bar */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{completedCount}</Text>
              <Text style={styles.summaryLabel}>{t("doses_completed")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalCount - completedCount}</Text>
              <Text style={styles.summaryLabel}>{t("doses_remaining")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{totalCount}</Text>
              <Text style={styles.summaryLabel}>{t("total_doses")}</Text>
            </View>
          </View>
        </View>

        {/* Vaccine cards */}
        {vaccines.map((v) => {
          const isDone = v.dosesGiven >= v.totalDoses;
          const remaining = Math.max(0, v.totalDoses - v.dosesGiven);
          const progress = v.totalDoses > 0 ? v.dosesGiven / v.totalDoses : 0;

          return (
            <Card key={v.id} style={[styles.card, isDone && styles.cardDone]}>
              <Card.Content>
                {/* Top row: icon + name + delete */}
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    {isDone ? (
                      <CheckCircle2 size={22} color="#A8E6CF" />
                    ) : (
                      <Syringe size={22} color="#7C8CFF" />
                    )}
                    <View style={styles.nameBlock}>
                      <Text style={[styles.name, isDone && styles.doneText]}>
                        {v.name}
                      </Text>
                      {v.lastDate ? (
                        <View style={styles.dateRow}>
                          <Calendar size={11} color="#8A8FA3" />
                          <Text style={styles.dateText}>{v.lastDate}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <IconButton
                    icon={() => <Trash2 size={18} color="#FF9AA2" />}
                    onPress={() => deleteVaccine(v.id)}
                    style={styles.deleteBtn}
                  />
                </View>

                {/* Progress bar */}
                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(progress * 100, 100)}%`,
                        backgroundColor: isDone ? "#A8E6CF" : "#7C8CFF",
                      },
                    ]}
                  />
                </View>

                {/* Dose info + controls */}
                <View style={styles.doseRow}>
                  {/* Labels */}
                  <View style={styles.doseStats}>
                    <View style={styles.doseStat}>
                      <Text style={styles.doseNumber}>{v.dosesGiven}</Text>
                      <Text style={styles.doseLabel}>{t("doses_given")}</Text>
                    </View>
                    <Text style={styles.doseSep}>/</Text>
                    <View style={styles.doseStat}>
                      <Text style={styles.doseNumber}>{v.totalDoses}</Text>
                      <Text style={styles.doseLabel}>{t("total_doses")}</Text>
                    </View>
                    <View style={[styles.remainingBadge, isDone && styles.remainingBadgeDone]}>
                      <Text style={[styles.remainingText, isDone && styles.remainingTextDone]}>
                        {isDone
                          ? t("doses_completed")
                          : `${remaining} ${t("doses_remaining")}`}
                      </Text>
                    </View>
                  </View>

                  {/* +/- buttons */}
                  <View style={styles.doseControls}>
                    <TouchableOpacity
                      onPress={() => decrementDose(v.id)}
                      style={[styles.doseBtn, v.dosesGiven === 0 && styles.doseBtnDisabled]}
                      disabled={v.dosesGiven === 0}
                    >
                      <Minus size={16} color={v.dosesGiven === 0 ? "#CCC" : "#7C8CFF"} />
                    </TouchableOpacity>
                    <Text style={styles.doseBtnCount}>{v.dosesGiven}</Text>
                    <TouchableOpacity
                      onPress={() => incrementDose(v.id)}
                      style={[styles.doseBtn, isDone && styles.doseBtnDisabled]}
                      disabled={isDone}
                    >
                      <Plus size={16} color={isDone ? "#CCC" : "#A8E6CF"} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: "#7C8CFF" }]}
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
            {t("add_vaccine")}
          </Text>
          <TextInput
            label={t("vaccine_name")}
            value={newName}
            onChangeText={setNewName}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label={t("total_doses")}
            value={newTotalDoses}
            onChangeText={setNewTotalDoses}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
          />
          <TextInput
            label={t("date_placeholder")}
            value={newDate}
            onChangeText={setNewDate}
            mode="outlined"
            style={styles.input}
            placeholder="YYYY-MM-DD"
          />
          <View style={styles.modalButtons}>
            <Button onPress={() => setVisible(false)}>{t("cancel")}</Button>
            <Button mode="contained" onPress={addVaccine} style={styles.addBtn}>
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
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    elevation: 2,
  },
  headerTitle: {
    fontWeight: "bold",
    marginTop: 12,
    color: "#5A5F73",
  },
  headerSubtitle: {
    color: "#8A8FA3",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    marginTop: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#7C8CFF",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#8A8FA3",
    marginTop: 2,
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#E0E4F0",
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "#FFF",
    elevation: 2,
  },
  cardDone: {
    borderLeftWidth: 4,
    borderLeftColor: "#A8E6CF",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  nameBlock: {
    marginLeft: 10,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5A5F73",
  },
  doneText: {
    color: "#A8E6CF",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: "#8A8FA3",
    marginLeft: 3,
  },
  deleteBtn: {
    margin: 0,
    padding: 0,
  },
  progressBg: {
    height: 6,
    backgroundColor: "#EEF0FB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  doseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  doseStats: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
    gap: 4,
  },
  doseStat: {
    alignItems: "center",
  },
  doseNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5A5F73",
    lineHeight: 20,
  },
  doseLabel: {
    fontSize: 10,
    color: "#8A8FA3",
  },
  doseSep: {
    fontSize: 18,
    color: "#CCC",
    marginHorizontal: 4,
  },
  remainingBadge: {
    backgroundColor: "#EEF0FB",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  remainingBadgeDone: {
    backgroundColor: "#D6F5E8",
  },
  remainingText: {
    fontSize: 11,
    color: "#7C8CFF",
    fontWeight: "600",
  },
  remainingTextDone: {
    color: "#4CAF50",
  },
  doseControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  doseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4FB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E4F0",
  },
  doseBtnDisabled: {
    opacity: 0.4,
  },
  doseBtnCount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5A5F73",
    minWidth: 24,
    textAlign: "center",
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
    color: "#5A5F73",
  },
  input: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  addBtn: {
    marginLeft: 12,
    backgroundColor: "#7C8CFF",
  },
});

export default VaccinationScreen;
