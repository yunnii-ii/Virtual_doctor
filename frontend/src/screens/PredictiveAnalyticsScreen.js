import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View, TouchableOpacity } from "react-native";
import { Card, ProgressBar, Text, Divider } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Activity, Droplet, Heart, TrendingUp, Volume2, VolumeX, Sparkles, AlertCircle, Info } from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { COLORS, FONTS, SHADOWS } from "../utils/theme";
import { predictiveAnalytics } from "../api";
import { speak, stop as stopTts } from "../utils/tts";

const PredictiveAnalyticsScreen = () => {
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === "mm";

  const [signals, setSignals] = useState({
    bp: null,
    bpLogs: [],
    water: 0,
    bmi: null,
    moodCount: 0,
  });
  const [analysis, setAnalysis] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
  }, [i18n.language]);

  const stopSpeech = async () => {
    try {
      await stopTts();
      setIsSpeaking(false);
    } catch (e) {
      console.log("TTS stop error:", e);
    }
  };

  const speakForecast = async () => {
    if (!analysis) return;
    if (isSpeaking) {
      await stopSpeech();
      return;
    }

    let speech = "";
    if (isMM) {
      speech = `လာမည့် ၇ ရက်အတွက် ကျန်းမာရေး ခန့်မှန်းချက်။ အန္တရာယ်အဆင့် - ${
        analysis.risk_level === "high"
          ? "အန္တရာယ်များလာမှု"
          : analysis.risk_level === "moderate"
          ? "အလယ်အလတ် အန္တရာယ်"
          : "တည်ငြိမ်နေသော လျှောက်လမ်း"
      }။ ${analysis.forecast || ""}။ `;
      if (analysis.risk_factors && analysis.risk_factors.length > 0) {
        speech += "သတိပြုရန် အချက်များမှာ - " + analysis.risk_factors.join("။ ") + " ဖြစ်ပါသည်။";
      }
    } else {
      speech = `7-day health forecast. Risk level is ${analysis.risk_level}. ${analysis.forecast || ""}. `;
      if (analysis.risk_factors && analysis.risk_factors.length > 0) {
        speech += "Risk factors include: " + analysis.risk_factors.join(". ");
      }
    }

    try {
      setIsSpeaking(true);
      await speak(speech, {
        language: isMM ? "my" : "en",
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (e) {
      console.log("TTS error:", e);
      setIsSpeaking(false);
    }
  };

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

      <Card style={[styles.card, styles.forecastCard]}>
        <Card.Content>
          <View style={styles.forecastHeaderRow}>
            <View style={styles.forecastHeaderLeft}>
              <Sparkles size={22} color={COLORS.analytics} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t("predictive_next_7_days_forecast")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={speakForecast}
              style={[styles.speakBtn, { backgroundColor: level.color }]}
              activeOpacity={0.8}
              accessibilityLabel="Listen to forecast"
            >
              {isSpeaking ? <VolumeX size={18} color="#FFF" /> : <Volume2 size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>

          <Text style={styles.bodyText}>
            {analysis?.forecast || t("predictive_loading_forecast")}
          </Text>

          {analysis?.bp_trend && (
            <View style={styles.trendRow}>
              <Text style={styles.trendLabel}>
                {t("predictive_bp_trend")}:
              </Text>
              <View style={styles.trendBadge}>
                <Text style={styles.trendBadgeText}>
                  {analysis.bp_trend === "not_enough_data"
                    ? t("predictive_bp_trend_not_enough_data")
                    : analysis.bp_trend === "rising"
                    ? t("predictive_bp_trend_rising")
                    : analysis.bp_trend === "improving"
                    ? t("predictive_bp_trend_improving")
                    : t("predictive_bp_trend_stable")}
                </Text>
              </View>
            </View>
          )}

          {analysis?.risk_factors && analysis.risk_factors.length > 0 && (
            <View style={styles.factorsSection}>
              <Text style={styles.factorsHeading}>
                ⚠️ {isMM ? "သတိပြုရမည့် အချက်များ :" : "Health Factors Detected :"}
              </Text>
              {analysis.risk_factors.map((factor, fIdx) => (
                <View key={`factor-${fIdx}`} style={styles.factorItemRow}>
                  <Text style={styles.factorBullet}>•</Text>
                  <Text style={styles.factorText}>{factor}</Text>
                </View>
              ))}
            </View>
          )}
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
  forecastCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.analytics,
  },
  metricRow: { flexDirection: "row", alignItems: "center" },
  iconBox: { padding: 12, borderRadius: 10 },
  metricText: { flex: 1, marginLeft: 14 },
  metricTitle: { ...FONTS.bold, color: COLORS.textPrimary },
  metricValue: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 3 },
  forecastHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  forecastHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: { ...FONTS.bold, color: COLORS.textPrimary },
  speakBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  bodyText: { 
    ...FONTS.regular, 
    color: COLORS.textPrimary, 
    marginTop: 6,
    lineHeight: 22,
    fontSize: 14,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  trendLabel: {
    fontWeight: "bold",
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  trendBadge: {
    backgroundColor: COLORS.analytics + "20",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  trendBadgeText: {
    color: COLORS.analytics,
    fontWeight: "bold",
    fontSize: 12,
  },
  factorsSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  factorsHeading: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  factorItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    gap: 6,
  },
  factorBullet: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: "bold",
  },
  factorText: { 
    ...FONTS.regular, 
    color: COLORS.textPrimary, 
    fontSize: 13,
    flex: 1,
    lineHeight: 19,
  },
});

export default PredictiveAnalyticsScreen;
