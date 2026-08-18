import React from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Provider as PaperProvider, MD3LightTheme, Text, Portal, Modal, Button } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import { Home, User, Activity, Pill, History, Bell } from "lucide-react-native";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "./src/utils/AuthContext";
import ErrorBoundary from "./src/components/ErrorBoundary";
import "./src/utils/i18n";
import { useTranslation } from "react-i18next";
import { playAlarmRingtone, stopAlarmRingtone } from "./src/utils/alarmSound";

import HomeScreen from "./src/screens/HomeScreen";
import SymptomCheckerScreen from "./src/screens/SymptomCheckerScreen";
import MedicineInfoScreen from "./src/screens/MedicineInfoScreen";
import HealthTipsScreen from "./src/screens/HealthTipsScreen";
import NearbyHospitalsScreen from "./src/screens/NearbyHospitalsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import FirstAidScreen from "./src/screens/FirstAidScreen";
import MedicineAlarmScreen from "./src/screens/MedicineAlarmScreen";
import VaccinationScreen from "./src/screens/VaccinationScreen";
import BMICalculatorScreen from "./src/screens/BMICalculatorScreen";
import WaterTrackerScreen from "./src/screens/WaterTrackerScreen";
import BloodPressureScreen from "./src/screens/BloodPressureScreen";
import AppointmentScreen from "./src/screens/AppointmentScreen";
import LabReportScreen from "./src/screens/LabReportScreen";
import MoodTrackerScreen from "./src/screens/MoodTrackerScreen";
import BreathingScreen from "./src/screens/BreathingScreen";
import HealthReportScreen from "./src/screens/HealthReportScreen";
import MedicineInteractionScreen from "./src/screens/MedicineInteractionScreen";
import PrivacyShieldScreen from "./src/screens/PrivacyShieldScreen";
import ClinicalDecisionSupportScreen from "./src/screens/ClinicalDecisionSupportScreen";
import PredictiveAnalyticsScreen from "./src/screens/PredictiveAnalyticsScreen";
import TelemedicineScreen from "./src/screens/TelemedicineScreen";
import VoiceAssistantScreen from "./src/screens/VoiceAssistantScreen";
import PersonalizedInterventionScreen from "./src/screens/PersonalizedInterventionScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const appFontFamily = "Times New Roman";

const theme = {
  ...MD3LightTheme,
  fonts: Object.fromEntries(
    Object.entries(MD3LightTheme.fonts).map(([variant, font]) => [
      variant,
      { ...font, fontFamily: appFontFamily },
    ]),
  ),
  colors: {
    ...MD3LightTheme.colors,
    primary: "#1A73E8",
    secondary: "#4CAF50",
    tertiary: "#FFC107",
  },
};

function HomeStack() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: "#FFF",
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: { fontFamily: appFontFamily, fontWeight: "bold" },
        headerTintColor: "#333",
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SymptomChecker"
        component={SymptomCheckerScreen}
        options={{ title: t("symptom_checker") }}
      />
      <Stack.Screen
        name="MedicineInfo"
        component={MedicineInfoScreen}
        options={{ title: t("medicine_info") }}
      />
      <Stack.Screen
        name="HealthTips"
        component={HealthTipsScreen}
        options={{ title: t("health_tips") }}
      />
      <Stack.Screen
        name="NearbyHospitals"
        component={NearbyHospitalsScreen}
        options={{ title: t("nearby_hospitals") }}
      />
      <Stack.Screen
        name="FirstAid"
        component={FirstAidScreen}
        options={{ title: t("first_aid") }}
      />
      <Stack.Screen
        name="MedicineAlarm"
        component={MedicineAlarmScreen}
        options={{ title: t("med_alarm") }}
      />
      <Stack.Screen
        name="Vaccination"
        component={VaccinationScreen}
        options={{ title: t("vaccination_tracker") }}
      />
      <Stack.Screen
        name="BMICalculator"
        component={BMICalculatorScreen}
        options={{ title: t("bmi_calculator") }}
      />
      <Stack.Screen
        name="WaterTracker"
        component={WaterTrackerScreen}
        options={{ title: t("water_tracker") }}
      />
      <Stack.Screen
        name="BloodPressure"
        component={BloodPressureScreen}
        options={{ title: t("blood_pressure_log") }}
      />
      <Stack.Screen
        name="Appointments"
        component={AppointmentScreen}
        options={{ title: t("appointments") }}
      />
      <Stack.Screen
        name="LabReports"
        component={LabReportScreen}
        options={{ title: t("lab_reports") }}
      />
      <Stack.Screen
        name="MoodTracker"
        component={MoodTrackerScreen}
        options={{ title: t("mood_tracker") }}
      />
      <Stack.Screen
        name="Breathing"
        component={BreathingScreen}
        options={{ title: t("breathing_exercise") }}
      />
      <Stack.Screen
        name="HealthReport"
        component={HealthReportScreen}
        options={{ title: t("health_summary") }}
      />
      <Stack.Screen
        name="MedicineInteraction"
        component={MedicineInteractionScreen}
        options={{ title: t("interaction_checker") }}
      />
      <Stack.Screen
        name="ClinicalDecisionSupport"
        component={ClinicalDecisionSupportScreen}
        options={{ title: t("clinical_decision_support") }}
      />
      <Stack.Screen
        name="PredictiveAnalytics"
        component={PredictiveAnalyticsScreen}
        options={{ title: t("predictive_analytics") }}
      />
      <Stack.Screen
        name="Telemedicine"
        component={TelemedicineScreen}
        options={{ title: t("telemedicine") }}
      />
      <Stack.Screen
        name="PrivacyShield"
        component={PrivacyShieldScreen}
        options={{ title: t("federated_learning") }}
      />
      <Stack.Screen
        name="VoiceAssistant"
        component={VoiceAssistantScreen}
        options={{ title: t("voice_assistant") }}
      />
      <Stack.Screen
        name="PersonalizedIntervention"
        component={PersonalizedInterventionScreen}
        options={{ title: t("personalized_intervention") }}
      />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainApp() {
  const { user, loading, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === "mm";

  const [ringingAlarm, setRingingAlarm] = React.useState(null);

  React.useEffect(() => {
    // Listen for alarms and notifications
    const subReceived = Notifications.addNotificationReceivedListener(async (notif) => {
      try {
        const title = notif.request.content.title || (isMM ? "သတိပေးချက်" : "Alarm");
        const body = notif.request.content.body || "";
        await playAlarmRingtone();
        setRingingAlarm({ title, body });
      } catch (e) {
        console.log("Error handling notification sound:", e);
      }
    });

    const subResponse = Notifications.addNotificationResponseReceivedListener(async (resp) => {
      try {
        const title = resp.notification.request.content.title || (isMM ? "သတိပေးချက်" : "Alarm");
        const body = resp.notification.request.content.body || "";
        await playAlarmRingtone();
        setRingingAlarm({ title, body });
      } catch (e) {
        console.log("Error handling response sound:", e);
      }
    });

    return () => {
      subReceived.remove();
      subResponse.remove();
    };
  }, [isMM]);

  const dismissAlarm = async () => {
    await stopAlarmRingtone();
    setRingingAlarm(null);
  };

  if (loading) return null;

  return (
    <>
      <NavigationContainer>
        {!user ? (
          <AuthStack />
        ) : (
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ color, size }) => {
                if (route.name === "Home")
                  return <Home size={size} color={color} />;
                if (route.name === "Symptom")
                  return <Activity size={size} color={color} />;
                if (route.name === "Medicine")
                  return <Pill size={size} color={color} />;
                if (route.name === "HistoryTab")
                  return <History size={size} color={color} />;
                if (route.name === "Profile")
                  return <User size={size} color={color} />;
              },
              tabBarActiveTintColor: "#1A73E8",
              tabBarInactiveTintColor: "gray",
              headerShown: false,
              tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 10 },
              tabBarLabelStyle: { fontFamily: appFontFamily },
              headerTitleStyle: {
                fontFamily: appFontFamily,
                fontWeight: "bold",
              },
            })}
          >
            <Tab.Screen
              name="Home"
              component={HomeStack}
              options={{ title: t("welcome") }}
            />
            <Tab.Screen
              name="Symptom"
              component={SymptomCheckerScreen}
              options={{ headerShown: true, title: t("symptom_checker") }}
            />
            <Tab.Screen
              name="Medicine"
              component={MedicineInfoScreen}
              options={{ headerShown: true, title: t("medicine_info") }}
            />
            <Tab.Screen
              name="HistoryTab"
              component={HistoryScreen}
              options={{ headerShown: true, title: t("history") }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ headerShown: true, title: t("profile") }}
            />
          </Tab.Navigator>
        )}
      </NavigationContainer>

      {/* ── Global Alarm Ringing Popup ── */}
      {ringingAlarm && (
        <Portal>
          <Modal
            visible={!!ringingAlarm}
            onDismiss={dismissAlarm}
            contentContainerStyle={styles.ringingModal}
          >
            <View style={styles.ringingHeader}>
              <View style={styles.ringingIconCircle}>
                <Bell size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.ringingTitle}>{ringingAlarm.title}</Text>
              <Text style={styles.ringingBody}>{ringingAlarm.body}</Text>
            </View>

            <Button
              mode="contained"
              buttonColor="#EF4444"
              textColor="#FFFFFF"
              style={styles.ringingDismissBtn}
              contentStyle={{ paddingVertical: 8 }}
              labelStyle={{ fontSize: 16, fontWeight: "bold" }}
              onPress={dismissAlarm}
            >
              {isMM ? "🔔 Alarm ပိတ်မည်" : "Dismiss Alarm"}
            </Button>
          </Modal>
        </Portal>
      )}
    </>
  );
}

const styles = {
  ringingModal: {
    backgroundColor: "#FFFFFF",
    margin: 24,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  ringingHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  ringingIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    elevation: 4,
  },
  ringingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  ringingBody: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  ringingDismissBtn: {
    width: "100%",
    borderRadius: 14,
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="auto" />
      <ErrorBoundary>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </ErrorBoundary>
    </PaperProvider>
  );
}
