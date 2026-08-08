import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Animated } from "react-native";
import { Text, Card, Button, IconButton, useTheme } from "react-native-paper";
import { Droplet, Plus, Minus, History, Award } from "lucide-react-native";
import AsyncStorage from "../utils/asyncStorage";
import { useTranslation } from "react-i18next";
import { useAuth } from "../utils/AuthContext";
import { saveToHistory } from "../utils/storage";
import { saveHistoryToDB } from "../api";

const WaterTrackerScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [glassCount, setGlassCount] = useState(0);
  const goal = 8; // 8 glasses a day
  const [progress] = useState(new Animated.Value(0));

  useEffect(() => {
    loadProgress();
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: Math.min(glassCount / goal, 1),
      duration: 500,
      useNativeDriver: false,
    }).start();
    saveProgress();
  }, [glassCount]);

  const loadProgress = async () => {
    try {
      const today = new Date().toLocaleDateString();
      const stored = await AsyncStorage.getItem(`water_${today}`);
      if (stored) setGlassCount(parseInt(stored));
    } catch (e) {
      console.error(e);
    }
  };

  const saveProgress = async () => {
    try {
      const today = new Date().toLocaleDateString();
      await AsyncStorage.setItem(`water_${today}`, glassCount.toString());
    } catch (e) {
      console.error(e);
    }
  };

  const addGlass = async () => {
    const newCount = glassCount + 1;
    setGlassCount(newCount);
    const details = `Drank 1 glass, total ${newCount}/${goal}`;
    try {
      await saveToHistory({
        type: "Water",
        title: "Water Intake",
        details,
      });
      if (user && user.id) {
        await saveHistoryToDB("Water", "Water Intake", details, user.id);
      }
    } catch (error) {
      console.error("Error saving water history:", error);
    }
  };
  const removeGlass = () => setGlassCount((prev) => Math.max(0, prev - 1));

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.mainCard}>
        <Card.Content style={styles.center}>
          <Droplet size={64} color="#5568FF" fill="#5568FF20" />
          <Text variant="displayMedium" style={styles.count}>
            {glassCount} / {goal}
          </Text>
          <Text variant="titleMedium" style={styles.unit}>
            {t("glasses_today")}
          </Text>

          <View style={styles.progressBarBg}>
            <Animated.View
              style={[styles.progressBarFill, { width: progressWidth }]}
            />
          </View>

          <View style={styles.controls}>
            <IconButton
              icon={() => <Minus size={32} color="#8A8FA3" />}
              onPress={removeGlass}
              style={styles.controlBtn}
            />
            <Button
              mode="contained"
              onPress={addGlass}
              style={styles.addBtn}
              contentStyle={{ height: 60, width: 120 }}
            >
              <Plus size={32} color="#FFF" />
            </Button>
            <IconButton
              icon={() => <Plus size={32} color="#8A8FA3" />}
              style={{ opacity: 0 }}
            />
          </View>
        </Card.Content>
      </Card>

      <View style={styles.tipsContainer}>
        <Card style={styles.tipCard}>
          <Card.Content style={styles.row}>
            <Award size={24} color="#FBBF24" />
            <View style={styles.tipTextWrap}>
              <Text variant="titleMedium">{t("daily_goal")}</Text>
              <Text variant="bodySmall">
                {glassCount >= goal ? t("goal_reached") : t("keep_drinking")}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E8ECFF" },
  content: { padding: 16 },
  mainCard: {
    borderRadius: 32,
    elevation: 4,
    paddingVertical: 40,
    backgroundColor: "#FFF",
  },
  center: { alignItems: "center" },
  count: { fontWeight: "bold", color: "#5568FF", marginTop: 20 },
  unit: { color: "#8A8FA3", marginBottom: 30 },
  progressBarBg: {
    width: "80%",
    height: 12,
    backgroundColor: "#E8F0FF",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#5568FF" },
  controls: { flexDirection: "row", alignItems: "center", marginTop: 40 },
  controlBtn: { backgroundColor: "#F5F6FA", marginHorizontal: 10 },
  addBtn: {
    borderRadius: 20,
    marginHorizontal: 10,
    elevation: 8,
    backgroundColor: "#5568FF",
  },
  tipsContainer: { marginTop: 20 },
  tipCard: { borderRadius: 16, backgroundColor: "#FFF" },
  row: { flexDirection: "row", alignItems: "center" },
  tipTextWrap: { marginLeft: 16 },
});

export default WaterTrackerScreen;
