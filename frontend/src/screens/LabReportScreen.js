import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
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
} from "react-native-paper";
import {
  FileText,
  Camera,
  Plus,
  Trash2,
  Image as ImageIcon,
} from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

const LabReportScreen = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [image, setImage] = useState(null);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const stored = await AsyncStorage.getItem("lab_reports");
      if (stored) setReports(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const saveReports = async (newReports) => {
    try {
      await AsyncStorage.setItem("lab_reports", JSON.stringify(newReports));
      setReports(newReports);
    } catch (e) {
      console.error(e);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const addReport = () => {
    if (!title) return;
    const newReport = {
      id: Date.now().toString(),
      title,
      notes,
      image,
      date: new Date().toLocaleDateString(),
    };
    saveReports([newReport, ...reports]);
    setTitle("");
    setNotes("");
    setImage(null);
    setVisible(false);
  };

  const deleteReport = (id) => {
    saveReports(reports.filter((r) => r.id !== id));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {reports.length === 0 ? (
          <View style={styles.empty}>
            <FileText size={64} color="#D0D5DD" />
            <Text style={styles.emptyText}>{t("no_reports")}</Text>
          </View>
        ) : (
          reports.map((report) => (
            <Card key={report.id} style={styles.card}>
              <Card.Content>
                <View style={styles.header}>
                  <Text variant="titleLarge" style={styles.reportTitle}>
                    {report.title}
                  </Text>
                  <IconButton
                    icon={() => <Trash2 size={20} color="#FF9AA2" />}
                    onPress={() => deleteReport(report.id)}
                  />
                </View>
                <Text variant="bodySmall" style={styles.date}>
                  {report.date}
                </Text>
                {report.notes ? (
                  <Text style={styles.notes}>{report.notes}</Text>
                ) : null}
                {report.image ? (
                  <Image
                    source={{ uri: report.image }}
                    style={styles.reportImage}
                  />
                ) : null}
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: "#FFDAC1" }]}
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
            {t("add_lab_report")}
          </Text>
          <TextInput
            label={t("report_title")}
            value={title}
            onChangeText={setTitle}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label={t("notes")}
            value={notes}
            onChangeText={setNotes}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={32} color="#8A8FA3" />
                <Text>{t("select_image")}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.modalButtons}>
            <Button onPress={() => setVisible(false)}>{t("cancel")}</Button>
            <Button mode="contained" onPress={addReport} style={styles.addBtn}>
              {t("add")}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FF" },
  content: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { marginTop: 16, color: "#B0B5C0" },
  card: { marginBottom: 16, borderRadius: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportTitle: { fontWeight: "bold" },
  date: { color: "#B0B5C0", marginBottom: 8 },
  notes: { color: "#8A8FA3", marginBottom: 12 },
  reportImage: { width: "100%", height: 200, borderRadius: 12, marginTop: 8 },
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
  modalTitle: { marginBottom: 20, fontWeight: "bold" },
  input: { marginBottom: 16 },
  imagePicker: {
    height: 150,
    backgroundColor: "#F1F2F6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  imagePlaceholder: { alignItems: "center" },
  previewImage: { width: "100%", height: "100%" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  addBtn: { marginLeft: 12, backgroundColor: "#FFDAC1" },
});

export default LabReportScreen;
