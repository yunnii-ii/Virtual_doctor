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
  List,
  Checkbox,
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
  Plus,
  Trash2,
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

  const defaultVaccines = [
    { id: "1", name: "BCG", done: false, date: "" },
    { id: "2", name: "Hepatitis B", done: false, date: "" },
    { id: "3", name: "Polio", done: false, date: "" },
    { id: "4", name: "DPT", done: false, date: "" },
    { id: "5", name: "Measles & Rubella", done: false, date: "" },
    { id: "6", name: "COVID-19", done: false, date: "" },
  ];

  useEffect(() => {
    loadVaccines();
  }, []);

  const loadVaccines = async () => {
    try {
      const stored = await AsyncStorage.getItem("user_vaccines");
      if (stored) {
        setVaccines(JSON.parse(stored));
      } else {
        setVaccines(defaultVaccines);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveVaccines = async (list) => {
    try {
      await AsyncStorage.setItem("user_vaccines", JSON.stringify(list));
      setVaccines(list);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleVaccine = (id) => {
    const updated = vaccines.map((v) =>
      v.id === id
        ? {
            ...v,
            done: !v.done,
            date: !v.done ? new Date().toLocaleDateString() : "",
          }
        : v,
    );
    saveVaccines(updated);
  };

  const addVaccine = () => {
    if (!newName) return;
    const next = {
      id: Date.now().toString(),
      name: newName,
      done: false,
      date: newDate || "",
    };
    saveVaccines([...vaccines, next]);
    setNewName("");
    setNewDate("");
    setVisible(false);
  };

  const deleteVaccine = (id) => {
    saveVaccines(vaccines.filter((v) => v.id !== id));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <Shield size={48} color="#A8E6CF" />
          <Text variant="titleLarge" style={styles.headerTitle}>
            {t("vaccination_tracker")}
          </Text>
          <Text variant="bodySmall" style={styles.headerSubtitle}>
            {t("vaccination_desc")}
          </Text>
        </View>

        {vaccines.map((v) => (
          <Card
            key={v.id}
            style={styles.card}
            onPress={() => toggleVaccine(v.id)}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.left}>
                {v.done ? (
                  <CheckCircle2 size={24} color="#A8E6CF" />
                ) : (
                  <Circle size={24} color="#D0D5DD" />
                )}
                <View style={styles.textWrap}>
                  <Text style={[styles.name, v.done && styles.doneText]}>
                    {v.name}
                  </Text>
                  {v.date ? (
                    <View style={styles.dateRow}>
                      <Calendar size={12} color="#8A8FA3" />
                      <Text style={styles.dateText}>{v.date}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <IconButton
                icon={() => <Trash2 size={20} color="#FF9AA2" />}
                onPress={() => deleteVaccine(v.id)}
              />
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: "#A8E6CF" }]}
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
    elevation: 1,
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
  },
  card: {
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: "#FFF",
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  textWrap: {
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5A5F73",
  },
  doneText: {
    color: "#B0B5C0",
    textDecorationLine: "line-through",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: "#8A8FA3",
    marginLeft: 4,
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
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  addBtn: {
    marginLeft: 12,
    backgroundColor: "#A8E6CF",
  },
});

export default VaccinationScreen;
