import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Linking,
} from "react-native";
import { Text, Card, Button, useTheme } from "react-native-paper";
import { useAuth } from "../utils/AuthContext";
import {
  Activity,
  Pill,
  Lightbulb,
  ChevronRight,
  MapPin,
  Heart,
  Bell,
  Shield,
  Calculator,
  Droplet,
  Calendar,
  FileText,
  Smile,
  Wind,
  ShieldAlert,
  Brain,
  TrendingUp,
  Video,
  Mic,
  Sparkles,
  ShieldCheck,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import axios from "axios";

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t } = useTranslation();

  const normalizePhoneNumber = (phone) => {
    if (!phone || typeof phone !== "string") return null;
    const cleaned = phone.replace(/[^+\d]/g, "");
    const digits = cleaned.replace(/\D/g, "");
    return digits.length >= 7 ? cleaned : null;
  };

  const { user } = useAuth();

  const callEmergency = async () => {
    if (user?.emergency_contact) {
      Linking.openURL(`tel:${user.emergency_contact.replace(/\D/g, "")}`);
      return;
    }
    await callNearestHospital();
  };

  const callNearestHospital = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("error"), t("location_denied"));
        return;
      }

      const userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const query = `
        [out:json];
        (
          node["amenity"="hospital"](around:10000, ${userLocation.coords.latitude}, ${userLocation.coords.longitude});
          way["amenity"="hospital"](around:10000, ${userLocation.coords.latitude}, ${userLocation.coords.longitude});
          relation["amenity"="hospital"](around:10000, ${userLocation.coords.latitude}, ${userLocation.coords.longitude});
        );
        out center;
      `;

      const response = await axios({
        method: "post",
        url: "https://overpass-api.de/api/interpreter",
        data: "data=" + encodeURIComponent(query),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "VirtualDoctor/1.0",
        },
      });

      const elements = response.data?.elements || [];
      const nearestWithPhone = elements
        .map((element) => ({
          phone: normalizePhoneNumber(
            element.tags?.phone || element.tags?.["contact:phone"] || "",
          ),
          distance:
            (element.lat || element.center?.lat) &&
            (element.lon || element.center?.lon)
              ? Math.sqrt(
                  Math.pow(
                    (element.lat || element.center?.lat) -
                      userLocation.coords.latitude,
                    2,
                  ) +
                    Math.pow(
                      (element.lon || element.center?.lon) -
                        userLocation.coords.longitude,
                      2,
                    ),
                )
              : Number.MAX_VALUE,
        }))
        .filter((item) => item.phone)
        .sort((a, b) => a.distance - b.distance)[0];

      if (!nearestWithPhone?.phone) {
        Alert.alert(
          t("error"),
          t("emergency_no_phone") || "No nearby hospital phone found.",
        );
        return;
      }

      Linking.openURL(`tel:${nearestWithPhone.phone.replace(/\s/g, "")}`);
    } catch (error) {
      console.error("Emergency call failed:", error);
      Alert.alert(
        t("error"),
        t("emergency_call_failed") || "Could not place the call.",
      );
    }
  };

  const features = [
    {
      title: t("symptom_checker"),
      description: t("symptom_checker_desc"),
      icon: Activity,
      screen: "SymptomChecker",
      color: "#A8E6CF",
    },
    {
      title: t("medicine_info"),
      description: t("medicine_info_desc"),
      icon: Pill,
      screen: "MedicineInfo",
      color: "#7C8CFF",
    },
    {
      title: t("health_tips"),
      description: t("health_tips_desc"),
      icon: Lightbulb,
      screen: "HealthTips",
      color: "#FFE9A8",
    },
    {
      title: t("nearby_hospitals"),
      description: t("nearby_hospitals_desc"),
      icon: MapPin,
      screen: "NearbyHospitals",
      color: "#8FD6E1",
    },
    {
      title: t("first_aid"),
      description: t("first_aid_desc"),
      icon: Heart,
      screen: "FirstAid",
      color: "#FF9AA2",
    },
    {
      title: t("med_alarm"),
      description: t("med_alarm_desc"),
      icon: Bell,
      screen: "MedicineAlarm",
      color: "#C7B8FF",
    },
    {
      title: t("vaccination_tracker"),
      description: t("vaccination_tracker_desc"),
      icon: Shield,
      screen: "Vaccination",
      color: "#A8E6CF",
    },
    {
      title: t("bmi_calculator"),
      description: t("bmi_calculator_desc"),
      icon: Calculator,
      screen: "BMICalculator",
      color: "#7C8CFF",
    },
    {
      title: t("water_tracker"),
      description: t("water_tracker_desc"),
      icon: Droplet,
      screen: "WaterTracker",
      color: "#7C8CFF",
    },
    {
      title: t("blood_pressure_log"),
      description: t("blood_pressure_desc"),
      icon: Activity,
      screen: "BloodPressure",
      color: "#FFB7D9",
    },
    {
      title: t("appointments"),
      description: t("appointments_desc"),
      icon: Calendar,
      screen: "Appointments",
      color: "#C7B8FF",
    },
    {
      title: t("lab_reports"),
      description: t("lab_reports_desc"),
      icon: FileText,
      screen: "LabReports",
      color: "#FFDAC1",
    },
    {
      title: t("mood_tracker"),
      description: t("mood_tracker_desc"),
      icon: Smile,
      screen: "MoodTracker",
      color: "#A8E6CF",
    },
    {
      title: t("breathing_exercise"),
      description: t("breathing_desc"),
      icon: Wind,
      screen: "Breathing",
      color: "#8FD6E1",
    },
    {
      title: t("interaction_checker"),
      description: t("interaction_desc"),
      icon: ShieldAlert,
      screen: "MedicineInteraction",
      color: "#FFB7D9",
    },
    {
      title: t("health_summary"),
      description: t("health_summary_desc"),
      icon: FileText,
      screen: "HealthReport",
      color: "#A0A6B5",
    },
    {
      title: t("clinical_decision_support"),
      description: t("clinical_decision_support_desc"),
      icon: Brain,
      screen: "ClinicalDecisionSupport",
      color: "#B8A4FF",
    },
    {
      title: t("predictive_analytics"),
      description: t("predictive_analytics_desc"),
      icon: TrendingUp,
      screen: "PredictiveAnalytics",
      color: "#90D7FF",
    },
    {
      title: t("telemedicine"),
      description: t("telemedicine_desc"),
      icon: Video,
      screen: "Telemedicine",
      color: "#A2D2FF",
    },
    {
      title: t("federated_learning"),
      description: t("federated_learning_desc"),
      icon: ShieldCheck,
      screen: "PrivacyShield",
      color: "#FFB5B8",
    },
    {
      title: t("personalized_intervention"),
      description: t("personalized_intervention_desc"),
      icon: Sparkles,
      screen: "PersonalizedIntervention",
      color: "#FFD1B5",
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.welcome}>
          {t("welcome")}
        </Text>
        <Text variant="displaySmall" style={styles.brand}>
          Virtual Doctor
        </Text>
      </View>

      <View style={styles.featureList}>
        {features.map((feature, index) => (
          <Card
            key={index}
            style={styles.card}
            onPress={() => navigation.navigate(feature.screen)}
          >
            <Card.Content style={styles.cardContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: feature.color + "20" },
                ]}
              >
                <feature.icon size={32} color={feature.color} />
              </View>
              <View style={styles.textContainer}>
                <Text variant="titleLarge" style={styles.featureTitle}>
                  {feature.title}
                </Text>
                <Text variant="bodyMedium" style={styles.featureDesc}>
                  {feature.description}
                </Text>
              </View>
              <ChevronRight size={24} color="#D0D5DD" />
            </Card.Content>
          </Card>
        ))}
      </View>

      <Card style={styles.promoCard}>
        <Card.Content>
          <Text variant="titleMedium" style={{ color: "#FFF" }}>
            {t("emergency_help")}
          </Text>
          <Text variant="bodySmall" style={{ color: "#FFF", opacity: 0.8 }}>
            {t("emergency_desc")}
          </Text>
          <Button
            mode="contained"
            style={styles.callBtn}
            labelStyle={{ color: "#FF9AA2" }}
            onPress={callEmergency}
          >
            {user?.emergency_contact ? t("call_sos") : t("call_emergency")}
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FF",
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#FFF",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  welcome: {
    color: "#8A8FA3",
    fontFamily: "Times New Roman",
  },
  brand: {
    fontWeight: "bold",
    color: "#7C8CFF",
    fontFamily: "Times New Roman",
  },
  featureList: {
    padding: 16,
    marginTop: 10,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#FFF",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    padding: 12,
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontWeight: "bold",
    color: "#5A5F73",
    fontFamily: "Times New Roman",
  },
  featureDesc: {
    color: "#8A8FA3",
    marginTop: 4,
    fontFamily: "Times New Roman",
  },
  promoCard: {
    margin: 16,
    backgroundColor: "#FF9AA2",
    borderRadius: 20,
    padding: 8,
  },
  callBtn: {
    marginTop: 12,
    backgroundColor: "#FFF",
  },
});

export default HomeScreen;
