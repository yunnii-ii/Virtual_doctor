import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import {
  Text,
  Card,
  Button,
  TextInput,
  List,
  IconButton,
  FAB,
  Portal,
  Modal,
} from "react-native-paper";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Trash2,
  Bell,
} from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useTranslation } from "react-i18next";

const AppointmentScreen = () => {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [visible, setVisible] = useState(false);
  const [doctor, setDoctor] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const stored = await AsyncStorage.getItem("appointments");
      if (stored) setAppointments(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const saveAppointments = async (newApps) => {
    try {
      await AsyncStorage.setItem("appointments", JSON.stringify(newApps));
      setAppointments(newApps);
    } catch (e) {
      console.error(e);
    }
  };

  const addAppointment = () => {
    if (!doctor || !date) return;
    const newApp = {
      id: Date.now().toString(),
      doctor,
      date,
      location,
    };
    saveAppointments([...appointments, newApp]);
    setDoctor("");
    setDate("");
    setLocation("");
    setVisible(false);
  };

  const deleteAppointment = (id) => {
    saveAppointments(appointments.filter((a) => a.id !== id));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {appointments.length === 0 ? (
          <View style={styles.empty}>
            <Calendar size={64} color="#CCC" />
            <Text style={styles.emptyText}>{t("no_appointments")}</Text>
          </View>
        ) : (
          appointments.map((app) => (
            <Card key={app.id} style={styles.card}>
              <Card.Content>
                <View style={styles.header}>
                  <View style={styles.doctorInfo}>
                    <User size={20} color="#5568FF" />
                    <Text variant="titleLarge" style={styles.doctorName}>
                      {app.doctor}
                    </Text>
                  </View>
                  <IconButton
                    icon={() => <Trash2 size={20} color="#FF6B6B" />}
                    onPress={() => deleteAppointment(app.id)}
                  />
                </View>

                <View style={styles.detailRow}>
                  <Calendar size={16} color="#666" />
                  <Text style={styles.detailText}>{app.date}</Text>
                </View>

                {app.location ? (
                  <View style={styles.detailRow}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.detailText}>{app.location}</Text>
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
            {t("add_appointment")}
          </Text>
          <TextInput
            label={t("doctor_name")}
            value={doctor}
            onChangeText={setDoctor}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label={t("date_time")}
            value={date}
            onChangeText={setDate}
            mode="outlined"
            style={styles.input}
            placeholder="e.g. Monday, 10:00 AM"
          />
          <TextInput
            label={t("location")}
            value={location}
            onChangeText={setLocation}
            mode="outlined"
            style={styles.input}
          />
          <View style={styles.modalButtons}>
            <Button onPress={() => setVisible(false)}>{t("cancel")}</Button>
            <Button
              mode="contained"
              onPress={addAppointment}
              style={styles.addBtn}
            >
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
  emptyText: { marginTop: 16, color: "#999" },
  card: { marginBottom: 16, borderRadius: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  doctorInfo: { flexDirection: "row", alignItems: "center" },
  doctorName: { marginLeft: 12, fontWeight: "bold" },
  detailRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  detailText: { marginLeft: 8, color: "#666" },
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
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  addBtn: { marginLeft: 12, backgroundColor: "#5568FF" },
});

export default AppointmentScreen;
