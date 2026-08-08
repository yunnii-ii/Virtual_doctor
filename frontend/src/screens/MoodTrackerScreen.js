import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Text, Card, IconButton, useTheme } from "react-native-paper";
import { Smile, Frown, Meh, Laugh, Angry, Activity } from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useTranslation } from "react-i18next";
import { useAuth } from "../utils/AuthContext";
import { saveToHistory } from "../utils/storage";
import { saveHistoryToDB } from "../api";

const MoodTrackerScreen = () => {
  const { t } = useTranslation();
  const [moods, setMoods] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const { user } = useAuth();

  const moodOptions = [
    { id: "great", icon: Smile, color: "#10B981", label: t("mood_great") },
    { id: "good", icon: Laugh, color: "#10B981", label: t("mood_good") },
    { id: "neutral", icon: Meh, color: "#FBBF24", label: t("mood_neutral") },
    { id: "sad", icon: Frown, color: "#5568FF", label: t("mood_sad") },
    { id: "angry", icon: Angry, color: "#FF6B6B", label: t("mood_angry") },
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
    const newMood = {
      id: Date.now().toString(),
      moodId,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const updated = [newMood, ...moods];
    try {
      await AsyncStorage.setItem("mood_history", JSON.stringify(updated));
      setMoods(updated);
      setSelectedMood(moodId);
      setTimeout(() => setSelectedMood(null), 2000);

      const details = `${moodInfo.label} recorded at ${newMood.date} ${newMood.time}`;
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

  const getAnalysis = () => {
    if (moods.length < 3)
      return {
        title: t("need_more_data"),
        advice: t("keep_logging_mood"),
        color: "#8A8FA3",
      };

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
        title: t("feeling_positive"),
        advice: t("positive_advice"),
        color: "#10B981",
      };
    } else if (topMood === "sad" || topMood === "angry") {
      return {
        title: t("feeling_stressed"),
        advice: t("stressed_advice"),
        color: "#FF6B6B",
      };
    } else {
      return {
        title: t("feeling_neutral"),
        advice: t("neutral_advice"),
        color: "#FBBF24",
      };
    }
  };

  const analysis = getAnalysis();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.mainCard}>
        <Card.Content style={styles.center}>
          <Text variant="headlineSmall" style={styles.title}>
            {t("how_are_you_feeling")}
          </Text>
          <View style={styles.moodGrid}>
            {moodOptions.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodItem,
                  selectedMood === mood.id && {
                    backgroundColor: mood.color + "20",
                  },
                ]}
                onPress={() => saveMood(mood.id)}
              >
                <mood.icon
                  size={48}
                  color={mood.color}
                  fill={selectedMood === mood.id ? mood.color : "transparent"}
                />
                <Text style={[styles.moodLabel, { color: mood.color }]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={[styles.analysisCard, { borderLeftColor: analysis.color }]}>
        <Card.Content>
          <View style={styles.row}>
            <Activity size={24} color={analysis.color} />
            <Text
              variant="titleMedium"
              style={[styles.analysisTitle, { color: analysis.color }]}
            >
              {analysis.title}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.adviceText}>
            {analysis.advice}
          </Text>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.historyTitle}>
        {t("mood_history")}
      </Text>
      {moods.slice(0, 10).map((item) => {
        const moodInfo =
          moodOptions.find((m) => m.id === item.moodId) || moodOptions[2];
        return (
          <Card key={item.id} style={styles.historyCard}>
            <Card.Content style={styles.historyContent}>
              <View style={styles.row}>
                <moodInfo.icon size={24} color={moodInfo.color} />
                <View style={styles.textWrap}>
                  <Text variant="titleMedium">{moodInfo.label}</Text>
                  <Text variant="bodySmall">
                    {item.date} at {item.time}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F3F8" },
  content: { padding: 16 },
  mainCard: {
    borderRadius: 24,
    paddingVertical: 20,
    marginBottom: 24,
    elevation: 2,
  },
  center: { alignItems: "center" },
  title: { marginBottom: 30, fontWeight: "bold", color: "#5A5F73" },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  moodItem: {
    alignItems: "center",
    margin: 10,
    padding: 12,
    borderRadius: 16,
    width: "28%",
  },
  moodLabel: { marginTop: 8, fontSize: 12, fontWeight: "bold" },
  historyTitle: { marginBottom: 12, color: "#8A8FA3", fontWeight: "bold" },
  analysisCard: {
    borderRadius: 16,
    marginBottom: 24,
    borderLeftWidth: 6,
    backgroundColor: "#FFF",
  },
  analysisTitle: { marginLeft: 12, fontWeight: "bold" },
  adviceText: { marginTop: 8, color: "#7A7F93", lineHeight: 20 },
  historyCard: { marginBottom: 8, borderRadius: 12 },
  historyContent: { paddingVertical: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  textWrap: { marginLeft: 16 },
});

export default MoodTrackerScreen;
