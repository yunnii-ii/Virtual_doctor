import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Calendar, Droplet, Heart, Pill } from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useAuth } from "../utils/AuthContext";
import { COLORS, FONTS, SHADOWS } from "../utils/theme";

const PersonalizedInterventionScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState({ bp: null, water: 0, bmi: null });

  useEffect(() => {
    const loadData = async () => {
      const today = new Date().toLocaleDateString();
      const water = await AsyncStorage.getItem(`water_${today}`);
      const bpLogs = await AsyncStorage.getItem("bp_logs");
      const bmi = await AsyncStorage.getItem("user_bmi");
      setData({
        water: Number(water || 0),
        bp: bpLogs ? JSON.parse(bpLogs)[0] : null,
        bmi: bmi ? Number(bmi) : null,
      });
    };
    loadData();
  }, []);

  const guidance = useMemo(() => {
    const items = [];
    if (data.bp?.systolic > 130 || data.bp?.diastolic > 85) {
      items.push({
        title: t("personalized_blood_pressure_focus"),
        text: t("personalized_blood_pressure_focus_text"),
        icon: Heart,
        color: COLORS.danger,
      });
    } else {
      items.push({
        title: t("personalized_heart_health"),
        text: t("personalized_heart_health_text"),
        icon: Heart,
        color: COLORS.secondary,
      });
    }
    if (data.water < 6) {
      items.push({
        title: t("personalized_hydration_target"),
        text: t("personalized_hydration_target_text"),
        icon: Droplet,
        color: COLORS.primary,
      });
    }
    if (data.bmi >= 25) {
      items.push({
        title: t("personalized_weight_management"),
        text: t("personalized_weight_management_text"),
        icon: Calendar,
        color: COLORS.orange,
      });
    }
    items.push({
      title: t("personalized_medicine_safety"),
      text: t("personalized_medicine_safety_text"),
      icon: Pill,
      color: COLORS.purple,
    });
    return items;
  }, [data]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {t("personalized_intervention_screen_title")}
          </Text>
          <Text style={styles.subtitle}>
            {t("personalized_intervention_screen_subtitle", {
              profile: user?.name || t("personalized_profile_name"),
            })}
          </Text>
        </Card.Content>
      </Card>

      {guidance.map((item) => (
        <Card key={item.title} style={styles.card}>
          <Card.Content style={styles.row}>
            <View
              style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}
            >
              <item.icon size={26} color={item.color} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.bodyText}>{item.text}</Text>
            </View>
          </Card.Content>
        </Card>
      ))}

      <View style={styles.buttonRow}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate("WaterTracker")}
          style={styles.primaryButton}
        >
          {t("personalized_log_water")}
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate("BloodPressure")}
          style={styles.secondaryButton}
        >
          {t("personalized_log_bp")}
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  heroCard: {
    borderRadius: 14,
    backgroundColor: "#FFF6F1",
    marginBottom: 14,
    ...SHADOWS.small,
  },
  title: { ...FONTS.bold, color: COLORS.textPrimary },
  subtitle: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 6 },
  card: { borderRadius: 12, backgroundColor: COLORS.surface, marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: { padding: 12, borderRadius: 10 },
  textWrap: { flex: 1, marginLeft: 14 },
  cardTitle: { ...FONTS.bold, color: COLORS.textPrimary },
  bodyText: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 5 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: COLORS.intervention,
  },
  secondaryButton: { flex: 1, borderRadius: 8 },
});

export default PersonalizedInterventionScreen;
