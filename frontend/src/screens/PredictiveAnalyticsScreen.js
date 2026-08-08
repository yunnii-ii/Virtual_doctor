import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Card, ProgressBar, Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Activity, Droplet, Heart, TrendingUp } from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { COLORS, FONTS, SHADOWS } from "../utils/theme";
import { predictiveAnalytics } from "../api";

const PredictiveAnalyticsScreen = () => {
  const { t } = useTranslation();
  const [signals, setSignals] = useState({
    bp: null,
    bpLogs: [],
    water: 0,
    bmi: null,
    moodCount: 0,
  });
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    const loadSignals = async () => {
      const today = new Date().toLocaleDateString();
      const bpLogs = await AsyncStorage.getItem("bp_logs");
      const water = await AsyncStorage.getItem(`water_${today}`);
      const bmi = await AsyncStorage.getItem("user_bmi");
      const moods = await AsyncStorage.getItem("mood_logs");
      const parsedBp = bpLogs ? JSON.parse(bpLogs) : [];
      const parsedMoods = moods ? JSON.parse(moods) : [];
      const latestBp = parsedBp[0] || null;
      const nextSignals = {
        bp: latestBp,
        bpLogs: parsedBp,
        water: Number(water || 0),
        bmi: bmi ? Number(bmi) : null,
        moodCount: parsedMoods.length,
      };
      setSignals(nextSignals);
      try {
        const response = await predictiveAnalytics({
          bmi: nextSignals.bmi,
          water: nextSignals.water,
          bp_logs: parsedBp.map((log) => ({
            systolic: Number(log.systolic),
            diastolic: Number(log.diastolic),
            date: log.date,
          })),
          mood_logs: parsedMoods,
        });
        setAnalysis(response);
      } catch (error) {
        Alert.alert(
          "Predictive Analytics Error",
          error.response?.data?.detail || error.message,
        );
      }
    };
    loadSignals();
  }, []);

  const risk = analysis?.risk_score ?? 0;

  const level =
    analysis?.risk_level === "high"
      ? { label: t("predictive_high_risk_trend"), color: COLORS.danger }
      : analysis?.risk_level === "moderate"
        ? { label: t("predictive_moderate_risk_trend"), color: COLORS.orange }
        : { label: t("predictive_stable_risk_trend"), color: COLORS.secondary };

  const cards = [
    {
      title: t("predictive_bp_title"),
      value: signals.bp
        ? `${signals.bp.systolic}/${signals.bp.diastolic} mmHg`
        : t("predictive_no_log_yet"),
      icon: Heart,
      color: COLORS.danger,
    },
    {
      title: t("predictive_water_title"),
      value: `${signals.water} ${t("glasses_today")}`,
      icon: Droplet,
      color: COLORS.primary,
    },
    {
      title: t("predictive_bmi_title"),
      value: signals.bmi
        ? signals.bmi.toFixed(1)
        : t("predictive_no_bmi_saved"),
      icon: Activity,
      color: COLORS.analytics,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <TrendingUp size={34} color={COLORS.analytics} />
            <View style={styles.titleText}>
              <Text variant="headlineSmall" style={styles.title}>
                {t("predictive_analytics_screen_title")}
              </Text>
              <Text style={styles.subtitle}>
                {t("predictive_analytics_screen_subtitle")}
              </Text>
            </View>
          </View>
          <Text style={[styles.riskLabel, { color: level.color }]}>
            {level.label}
          </Text>
          <ProgressBar
            progress={risk / 100}
            color={level.color}
            style={styles.progress}
          />
          <Text style={styles.score}>
            {`${t("predictive_risk_score")}: ${risk}/100`}
          </Text>
        </Card.Content>
      </Card>

      {cards.map((item) => (
        <Card key={item.title} style={styles.card}>
          <Card.Content style={styles.metricRow}>
            <View
              style={[styles.iconBox, { backgroundColor: `${item.color}18` }]}
            >
              <item.icon size={26} color={item.color} />
            </View>
            <View style={styles.metricText}>
              <Text style={styles.metricTitle}>{item.title}</Text>
              <Text style={styles.metricValue}>{item.value}</Text>
            </View>
          </Card.Content>
        </Card>
      ))}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("predictive_next_7_days_forecast")}
          </Text>
          <Text style={styles.bodyText}>
            {analysis?.forecast || t("predictive_loading_forecast")}
          </Text>
          {analysis?.bp_trend && (
            <Text style={styles.bodyText}>
              {t("predictive_bp_trend")}: {
                analysis.bp_trend === "not_enough_data"
                  ? t("predictive_bp_trend_not_enough_data")
                  : analysis.bp_trend === "rising"
                  ? t("predictive_bp_trend_rising")
                  : analysis.bp_trend === "improving"
                  ? t("predictive_bp_trend_improving")
                  : t("predictive_bp_trend_stable")
              }
            </Text>
          )}
          {analysis?.risk_factors?.map((factor) => (
            <Text key={factor} style={styles.factorText}>
              - {factor}
            </Text>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  heroCard: {
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    marginBottom: 14,
    ...SHADOWS.small,
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  titleText: { flex: 1, marginLeft: 14 },
  title: { ...FONTS.bold, color: COLORS.textPrimary },
  subtitle: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
  riskLabel: { ...FONTS.bold, fontSize: 20, marginTop: 18 },
  progress: { height: 10, borderRadius: 6, marginTop: 12 },
  score: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 8 },
  card: { borderRadius: 12, backgroundColor: COLORS.surface, marginBottom: 12 },
  metricRow: { flexDirection: "row", alignItems: "center" },
  iconBox: { padding: 12, borderRadius: 10 },
  metricText: { flex: 1, marginLeft: 14 },
  metricTitle: { ...FONTS.bold, color: COLORS.textPrimary },
  metricValue: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 3 },
  sectionTitle: { ...FONTS.bold, color: COLORS.textPrimary },
  bodyText: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 8 },
  factorText: { ...FONTS.regular, color: COLORS.textPrimary, marginTop: 8 },
});

export default PredictiveAnalyticsScreen;
