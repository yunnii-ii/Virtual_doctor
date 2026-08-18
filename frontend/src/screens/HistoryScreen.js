import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Text, Card, Surface, Divider } from "react-native-paper";
import {
  Activity,
  Pill,
  Heart,
  Droplet,
  Smile,
  Trash2,
  Clock,
  FileText,
  AlertTriangle,
  Calendar,
} from "lucide-react-native";
import { getHistoryFromDB, clearHistoryInDB } from "../api";
import { useAuth } from "../utils/AuthContext";
import { getHistory, clearHistory } from "../utils/storage";
import { useTranslation } from "react-i18next";

// ── Medical English to Myanmar Dictionary for History Display ──
const DISEASE_DICT = {
  "nose disorder": "နှာခေါင်းဆိုင်ရာရောဂါ (Nose Disorder)",
  "common cold": "သာမန် အအေးမိနှာစေးခြင်း (Common Cold)",
  "influenza": "တုပ်ကွေးရောဂါ (Influenza)",
  "gastroenteritis": "အစာအိမ်နှင့် အူလမ်းကြောင်းရောင်ခြင်း (Gastroenteritis)",
  "hypertension": "သွေးတိုးရောဂါ (Hypertension)",
  "diabetes mellitus": "ဆီးချိုသွေးချိုရောဂါ (Diabetes)",
  "asthma": "ရင်ကြပ်ပန်းနာရောဂါ (Asthma)",
  "bronchitis": "လေပြွန်ရောင်ရမ်းခြင်း (Bronchitis)",
  "pneumonia": "အဆုတ်ရောင် အဆုတ်အအေးမိရောဂါ (Pneumonia)",
  "dengue fever": "သွေးလွန်တုပ်ကွေးရောဂါ (Dengue Fever)",
  "chikungunya": "ချီကွန်ဂန်းယားရောဂါ (Chikungunya)",
  "hand, foot & mouth disease": "လက်၊ ခြေ၊ ခံတွင်း ရောဂါ (HFMD)",
  "rabies": "ခွေးရူးပြန်ရောဂါ (Rabies)",
  "tetanus": "မေးခိုင်ရောဂါ (Tetanus)",
  "fatty liver": "အသည်းအဆီဖုံးရောဂါ (Fatty Liver)",
  "frozen shoulder": "ပခုံးခဲနာကျင်ခြင်း (Frozen Shoulder)",
  "cervical spondylosis": "ဇက်ဆစ်ရိုးကျီးပေါင်းတက်ခြင်း (Cervical Spondylosis)",
  "sinusitis": "ထိပ်ကပ်နာရောဂါ (Sinusitis)",
  "allergic rhinitis": "ဓာတ်မတည့် နှာစေးရောဂါ (Allergic Rhinitis)",
  "gastritis": "အစာအိမ်ရောင်ရမ်းခြင်း (Gastritis)",
  "gerd": "အစာအိမ်အက်ဆစ် အထက်သို့ဆန်တက်ခြင်း (GERD)",
  "migraine": "ခေါင်းတစ်ခြမ်းကိုက်ရောဂါ (Migraine)",
  "tonsillitis": "အာသီးရောင်ခြင်း (Tonsillitis)",
  "malaria": "ငှက်ဖျားရောဂါ (Malaria)",
  "typhoid fever": "အူရောင်ငန်းဖျားရောဂါ (Typhoid Fever)",
  "tuberculosis": "တီဘီရောဂါ (Tuberculosis)",
  "chickenpox": "ရေကျောက်ရောဂါ (Chickenpox)",
  "gout": "ဂေါက်အဆစ်ရောင်ရောဂါ (Gout)",
  "insomnia": "အိပ်မပျော်ခြင်းဝေဒနာ (Insomnia)",
  "depression": "စိတ်ကျရောဂါ (Depression)",
  "anxiety disorder": "စိုးရိမ်ပူပန်လွန်ကဲမှုရောဂါ (Anxiety)",
};

const SYMPTOM_DICT = {
  "sneezing": "နှာချေခြင်း",
  "runny nose": "နှာစေးခြင်း",
  "sore throat": "လည်ချောင်းနာခြင်း",
  "fever": "ဖျားနာခြင်း",
  "cough": "ချောင်းဆိုးခြင်း",
  "headache": "ခေါင်းကိုက်ခြင်း",
  "fatigue": "မောပန်းနွမ်းနယ်ခြင်း",
  "shortness of breath": "အသက်ရှူကြပ်ခြင်း",
  "chest pain": "ရင်ဘတ်အောင့်ခြင်း",
  "nausea": "ပျို့အန်ချင်ခြင်း",
  "vomiting": "အန်ခြင်း",
  "diarrhea": "ဝမ်းသွားခြင်း",
  "abdominal pain": "ဗိုက်အောင့်ဗိုက်နာခြင်း",
  "joint pain": "အဆစ်အမြစ်ကိုက်ခဲခြင်း",
  "muscle aches": "ကြွက်သားများ နာကျင်ကိုက်ခဲခြင်း",
  "dizziness": "ခေါင်းမူးခြင်း",
  "itchy skin": "အရေပြားယားယံခြင်း",
  "skin rash": "အရေပြားအနီကွက်ထွက်ခြင်း",
  "loss of smell": "အနံ့မရခြင်း",
  "loss of taste": "အရသာမသိခြင်း",
  "constipation": "ဝမ်းချုပ်ခြင်း",
  "heartburn": "ရင်ပူခြင်း",
};

const HistoryScreen = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === "mm";

  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      if (user && user.id) {
        const data = await getHistoryFromDB(user.id);
        setHistory(Array.isArray(data) ? data : []);
      } else {
        const data = await getHistory();
        setHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      const data = await getHistory();
      setHistory(Array.isArray(data) ? data : []);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [user]);

  // Translate historical title to Myanmar
  const formatTitle = (title) => {
    if (!title) return "";
    if (!isMM) return title;
    const lower = title.toLowerCase().trim();
    if (DISEASE_DICT[lower]) return DISEASE_DICT[lower];
    return title;
  };

  // Translate historical details to Myanmar
  const formatDetails = (details) => {
    if (!details) return "";
    if (!isMM) return details;

    let result = details;

    // 1. Symptoms replacement
    if (result.includes("Symptoms:")) {
      result = result.replace("Symptoms:", "ရောဂါလက္ခဏာများ:");
      for (const [eng, mm] of Object.entries(SYMPTOM_DICT)) {
        const regex = new RegExp(`\\b${eng}\\b`, "gi");
        result = result.replace(regex, mm);
      }
      result = result.replace(/,\s*/g, "၊ ");
    }

    // 2. Mood recorded replacement
    if (result.includes("recorded at")) {
      result = result.replace("recorded at", "မှတ်တမ်းတင်ချိန်:");
    }

    // 3. Interaction severity replacement
    if (result.includes("HIGH:")) {
      result = result.replace("HIGH:", "⚠️ အန္တရာယ် အလွန်မြင့်မား:");
    } else if (result.includes("MODERATE:")) {
      result = result.replace("MODERATE:", "⚠️ သတိပြုရန်:");
    } else if (result.includes("LOW:")) {
      result = result.replace("LOW:", "ℹ️ အန္တရာယ် နည်းပါး:");
    }

    return result;
  };

  // Translate Type Badge
  const getTypeBadge = (type) => {
    switch (type) {
      case "Diagnosis":
        return {
          label: isMM ? "ရောဂါရှာဖွေမှု" : "Diagnosis",
          color: "#059669",
          bg: "#ECFDF5",
          icon: Activity,
        };
      case "Medicine":
        return {
          label: isMM ? "ဆေးဝါးစုံစမ်းမှု" : "Medicine",
          color: "#5568FF",
          bg: "#EEF2FF",
          icon: Pill,
        };
      case "Blood Pressure":
        return {
          label: isMM ? "သွေးပေါင်ချိန်" : "Blood Pressure",
          color: "#EF4444",
          bg: "#FEF2F2",
          icon: Heart,
        };
      case "Mood":
        return {
          label: isMM ? "စိတ်ခံစားမှု" : "Mood",
          color: "#D97706",
          bg: "#FFFBEB",
          icon: Smile,
        };
      case "Interaction":
        return {
          label: isMM ? "ဆေးဝါးဓာတ်ပြုမှု" : "Interaction",
          color: "#DC2626",
          bg: "#FEF2F2",
          icon: AlertTriangle,
        };
      case "Water":
        return {
          label: isMM ? "ရေသောက်မှတ်တမ်း" : "Water Intake",
          color: "#0284C7",
          bg: "#F0F9FF",
          icon: Droplet,
        };
      default:
        return {
          label: isMM ? "မှတ်တမ်း" : "Record",
          color: "#64748B",
          bg: "#F1F5F9",
          icon: FileText,
        };
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      isMM ? "မှတ်တမ်းအားလုံး ဖျက်မည်" : "Clear All History",
      isMM
        ? "ကျန်းမာရေး မှတ်တမ်းအားလုံးကို ရှင်းလင်းဖျက်ပစ်ရန် သေချာပါသလား?"
        : "Are you sure you want to clear all health history logs?",
      [
        { text: isMM ? "မလုပ်တော့ပါ" : "Cancel", style: "cancel" },
        {
          text: isMM ? "ဖျက်မည်" : "Clear All",
          style: "destructive",
          onPress: async () => {
            if (user && user.id) {
              await clearHistoryInDB(user.id);
            }
            await clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#5568FF"]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="headlineSmall" style={styles.title}>
            {t("history") || (isMM ? "ကျန်းမာရေး မှတ်တမ်း" : "Health History")}
          </Text>
          <Text style={styles.subtitle}>
            {history.length} {isMM ? "ခု တွေ့ရှိပါသည်" : "records saved"}
          </Text>
        </View>

        {history.length > 0 && (
          <TouchableOpacity
            onPress={handleClearHistory}
            style={styles.clearHeaderBtn}
            activeOpacity={0.7}
          >
            <Trash2 size={15} color="#EF4444" />
            <Text style={styles.clearHeaderBtnText}>
              {isMM ? "အားလုံးဖျက်မည်" : "Clear All"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── History Cards List ── */}
      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>
            {isMM ? "မှတ်တမ်းများ မရှိသေးပါ" : "No history recorded yet"}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isMM
              ? "ရောဂါလက္ခဏာ စစ်ဆေးမှုများနှင့် စိတ်ခံစားမှု မှတ်တမ်းများ ဤနေရာတွင် ပေါ်လာပါမည်။"
              : "Your diagnoses, medicine lookups, and mood logs will appear here."}
          </Text>
        </View>
      ) : (
        history.map((item, index) => {
          const typeBadge = getTypeBadge(item.type);
          const IconComp = typeBadge.icon;
          const displayTitle = formatTitle(item.title);
          const displayDetails = formatDetails(item.details);

          return (
            <View key={item.id || `hist-${index}`} style={styles.historyCard}>
              {/* Type badge + timestamp */}
              <View style={styles.cardTopRow}>
                <View style={[styles.typePill, { backgroundColor: typeBadge.bg }]}>
                  <IconComp size={13} color={typeBadge.color} />
                  <Text style={[styles.typePillText, { color: typeBadge.color }]}>
                    {typeBadge.label}
                  </Text>
                </View>

                {item.timestamp ? (
                  <View style={styles.timestampRow}>
                    <Clock size={12} color="#94A3B8" />
                    <Text style={styles.timestampText}>{item.timestamp}</Text>
                  </View>
                ) : null}
              </View>

              {/* Title */}
              <Text style={styles.historyTitleText}>{displayTitle}</Text>

              {/* Details */}
              {displayDetails ? (
                <Text style={styles.historyDetailsText}>{displayDetails}</Text>
              ) : null}
            </View>
          );
        })
      )}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontWeight: "bold",
    color: "#1E293B",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  clearHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  clearHeaderBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "bold",
  },

  // Empty State
  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#475569",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },

  // History Card
  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timestampText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  historyTitleText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 6,
  },
  historyDetailsText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 19,
  },
});

export default HistoryScreen;
