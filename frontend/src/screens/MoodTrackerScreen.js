import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Text, Card, Surface } from "react-native-paper";
import {
  Smile,
  Frown,
  Meh,
  Laugh,
  Angry,
  Activity,
  Sparkles,
  Calendar,
  Clock,
  Trash2,
  Heart,
  TrendingUp,
} from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useTranslation } from "react-i18next";
import { useAuth } from "../utils/AuthContext";
import { saveToHistory } from "../utils/storage";
import { saveHistoryToDB } from "../api";

const MoodTrackerScreen = () => {
  const { t, i18n } = useTranslation();
  const [moods, setMoods] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [justSaved, setJustSaved] = useState(null);
  const { user } = useAuth();

  const moodOptions = [
    {
      id: "great",
      icon: Smile,
      emoji: "😄",
      color: "#059669",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      label: t("mood_great") || "အရမ်းကောင်း",
    },
    {
      id: "good",
      icon: Laugh,
      emoji: "🙂",
      color: "#0D9488",
      bg: "#F0FDFA",
      border: "#99F6E4",
      label: t("mood_good") || "ကောင်းတယ်",
    },
    {
      id: "neutral",
      icon: Meh,
      emoji: "😐",
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
      label: t("mood_neutral") || "ပုံမှန်ပဲ",
    },
    {
      id: "sad",
      icon: Frown,
      emoji: "😔",
      color: "#2563EB",
      bg: "#EFF6FF",
      border: "#BFDBFE",
      label: t("mood_sad") || "ဝမ်းနည်းတယ်",
    },
    {
      id: "angry",
      icon: Angry,
      emoji: "😡",
      color: "#DC2626",
      bg: "#FEF2F2",
      border: "#FECACA",
      label: t("mood_angry") || "ဒေါသထွက်",
    },
  ];

  useEffect(() => {
    loadMoods();
  }, []);

  const loadMoods = async () => {
    try {
      const stored = await AsyncStorage.getItem("mood_history");
      if (stored) setMoods(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const saveMood = async (moodId) => {
    const moodInfo = moodOptions.find((m) => m.id === moodId) || moodOptions[2];
    const now = new Date();
    const newMood = {
      id: Date.now().toString(),
      moodId,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: now.getTime(),
    };
    const updated = [newMood, ...moods];
    try {
      await AsyncStorage.setItem("mood_history", JSON.stringify(updated));
      setMoods(updated);
      setSelectedMood(moodId);
      setJustSaved(moodInfo);
      setTimeout(() => setJustSaved(null), 3000);

      const isMM = i18n.language === "mm";
      const details = isMM
        ? `${moodInfo.label} - ${newMood.date} ${newMood.time} တွင် မှတ်တမ်းတင်ခဲ့သည်`
        : `${moodInfo.label} recorded at ${newMood.date} ${newMood.time}`;

      await saveToHistory({
        type: "Mood",
        title: moodInfo.label,
        details,
      });
      if (user && user.id) {
        await saveHistoryToDB("Mood", moodInfo.label, details, user.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteMood = async (id) => {
    const updated = moods.filter((m) => m.id !== id);
    setMoods(updated);
    await AsyncStorage.setItem("mood_history", JSON.stringify(updated));
  };

  const getAnalysis = () => {
    if (moods.length < 3) {
      return {
        title: t("need_more_data") || "အချက်အလက် ပိုမိုလိုအပ်သည်",
        advice:
          t("keep_logging_mood") ||
          "အလိုအလျောက် ဆန်းစစ်ချက်ရရှိရန် အနည်းဆုံး ၃ ရက်ခန့် စိတ်ခံစားမှုကို မှတ်တမ်းတင်ပေးပါ။",
        color: "#64748B",
        bg: "#F8FAFC",
        border: "#CBD5E1",
      };
    }

    const last7 = moods.slice(0, 7);
    const counts = last7.reduce((acc, curr) => {
      acc[curr.moodId] = (acc[curr.moodId] || 0) + 1;
      return acc;
    }, {});

    const topMood = Object.keys(counts).reduce((a, b) =>
      (counts[a] || 0) > (counts[b] || 0) ? a : b,
    );

    if (topMood === "great" || topMood === "good") {
      return {
        title: t("feeling_positive") || "စိတ်ခံစားမှု ကောင်းမွန်နေသည်!",
        advice:
          t("positive_advice") ||
          "မကြာသေးမီက သင်ဟာ စိတ်ပျော်ရွှင်နေပုံရပါတယ်။ ဒီလိုပဲ အပြုသဘောဆောင်သော အလေ့အကျင့်များကို ဆက်လက်ထိန်းသိမ်းပါ။",
        color: "#059669",
        bg: "#ECFDF5",
        border: "#A7F3D0",
      };
    } else if (topMood === "sad" || topMood === "angry") {
      return {
        title: t("feeling_stressed") || "စိတ်ဖိစီးမှု ရှိနေပုံရသည်",
        advice:
          t("stressed_advice") ||
          "မကြာသေးမီက စိတ်ညစ်ခြင်း သို့မဟုတ် ဒေါသထွက်ခြင်းများ ရှိနေပါသည်။ အသက်ရှူလေ့ကျင့်ခန်း ပြုလုပ်ကြည့်ပါ သို့မဟုတ် နီးစပ်သူများနှင့် စကားပြောဆိုပါ။",
        color: "#DC2626",
        bg: "#FEF2F2",
        border: "#FECACA",
      };
    } else {
      return {
        title: t("feeling_neutral") || "ပုံမှန် အခြေအနေမှာ ရှိသည်",
        advice:
          t("neutral_advice") ||
          "သင့်စိတ်အခြေအနေက တည်ငြိမ်နေပါတယ်။ လမ်းလျှောက်ခြင်း သို့မဟုတ် ဝါသနာပါရာ တစ်ခုခု ပြုလုပ်ကြည့်ပါ။",
        color: "#D97706",
        bg: "#FFFBEB",
        border: "#FDE68A",
      };
    }
  };

  const analysis = getAnalysis();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Main Question Card ── */}
      <Surface style={styles.mainCard} elevation={1}>
        <View style={styles.cardHeader}>
          <Heart size={20} color="#5568FF" />
          <Text style={styles.title}>
            {t("how_are_you_feeling") || "ဒီနေ့ စိတ်ခံစားမှု ဘယ်လိုရှိပါသလဲ?"}
          </Text>
        </View>

        {/* 5-Column Responsive Mood Row */}
        <View style={styles.moodRow}>
          {moodOptions.map((mood) => {
            const isSelected = selectedMood === mood.id;
            return (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodButton,
                  { backgroundColor: mood.bg, borderColor: mood.border },
                  isSelected && { borderColor: mood.color, backgroundColor: mood.color + "15", transform: [{ scale: 1.05 }] },
                ]}
                onPress={() => saveMood(mood.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: isSelected ? mood.color : "#FFFFFF" }]}>
                  <mood.icon
                    size={28}
                    color={isSelected ? "#FFFFFF" : mood.color}
                  />
                </View>
                <Text
                  style={[styles.moodLabel, { color: mood.color }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {mood.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback Alert Pill */}
        {justSaved && (
          <View style={[styles.feedbackPill, { backgroundColor: justSaved.bg, borderColor: justSaved.border }]}>
            <Sparkles size={16} color={justSaved.color} />
            <Text style={[styles.feedbackText, { color: justSaved.color }]}>
              {justSaved.label} - စိတ်ခံစားမှု မှတ်တမ်းတင်ပြီးပါပြီ!
            </Text>
          </View>
        )}
      </Surface>

      {/* ── Mood Analysis Card (Clear, readable, no broken dots) ── */}
      <View style={[styles.analysisCard, { borderLeftColor: analysis.color, backgroundColor: analysis.bg, borderColor: analysis.border }]}>
        <View style={styles.analysisHeaderRow}>
          <Activity size={20} color={analysis.color} />
          <Text style={[styles.analysisTitle, { color: analysis.color }]}>
            {analysis.title}
          </Text>
        </View>
        <Text style={styles.adviceText}>
          {analysis.advice}
        </Text>
      </View>

      {/* ── Mood History Section ── */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Calendar size={18} color="#5568FF" />
          <Text style={styles.historySectionTitle}>
            {t("mood_history") || "စိတ်ခံစားမှု မှတ်တမ်းများ"}
          </Text>
          <Text style={styles.historyCount}>({moods.length})</Text>
        </View>

        {moods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              မှတ်တမ်းများ မရှိသေးပါ။ အပေါ်ရှိ အီမိုဂျီများကို နှိပ်၍ စတင်မှတ်တမ်းတင်ပါ။
            </Text>
          </View>
        ) : (
          moods.slice(0, 10).map((item) => {
            const moodInfo =
              moodOptions.find((m) => m.id === item.moodId) || moodOptions[2];
            return (
              <View key={item.id} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <View style={[styles.historyIconCircle, { backgroundColor: moodInfo.bg }]}>
                    <moodInfo.icon size={22} color={moodInfo.color} />
                  </View>
                  <View style={styles.historyTextWrap}>
                    <Text style={[styles.historyMoodName, { color: moodInfo.color }]}>
                      {moodInfo.label}
                    </Text>
                    <View style={styles.historyTimeRow}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.historyDateText}>
                        {item.date} · {item.time}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => deleteMood(item.id)}
                  style={styles.deleteHistoryBtn}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },

  // Main Card
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
  },

  // 5-Column Responsive Mood Row
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  moodButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Feedback Pill
  feedbackPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: "bold",
  },

  // Analysis Card
  analysisCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderWidth: 1,
  },
  analysisHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  adviceText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },

  // History Section
  historySection: {
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  historySectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1E293B",
  },
  historyCount: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "600",
  },
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  // History Card
  historyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  historyTextWrap: {
    flex: 1,
  },
  historyMoodName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  historyTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyDateText: {
    fontSize: 12,
    color: "#94A3B8",
  },
  deleteHistoryBtn: {
    padding: 8,
  },
});

export default MoodTrackerScreen;
