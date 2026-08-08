import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text, Card, TextInput, Button, useTheme } from "react-native-paper";
import { Calculator, User, ArrowUpCircle, Info } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "../utils/asyncStorage";

const BMICalculatorScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bmi, setBmi] = useState(null);
  const [category, setCategory] = useState("");

  const calculateBMI = () => {
    if (!weight || !height) return;
    const hInMeters = height / 100;
    const bmiValue = (weight / (hInMeters * hInMeters)).toFixed(1);
    setBmi(bmiValue);
    AsyncStorage.setItem("user_bmi", bmiValue);

    if (bmiValue < 18.5) setCategory(t("underweight"));
    else if (bmiValue < 25) setCategory(t("normal_weight"));
    else if (bmiValue < 30) setCategory(t("overweight"));
    else setCategory(t("obese"));
  };

  const getCategoryColor = () => {
    if (!bmi) return "#D0D5DD";
    if (bmi < 18.5) return "#FBBF24";
    if (bmi < 25) return "#10B981";
    if (bmi < 30) return "#FB923C";
    return "#FF6B6B";
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Calculator size={32} color="#5568FF" />
            <Text variant="headlineSmall" style={styles.title}>
              {t("bmi_calculator")}
            </Text>
          </View>

          <TextInput
            label={t("weight") + " (kg)"}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            left={
              <TextInput.Icon icon={() => <User size={20} color="#8A8FA3" />} />
            }
          />

          <TextInput
            label={t("height") + " (cm)"}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            mode="outlined"
            style={styles.input}
            left={
              <TextInput.Icon
                icon={() => <ArrowUpCircle size={20} color="#8A8FA3" />}
              />
            }
          />

          <Button
            mode="contained"
            onPress={calculateBMI}
            style={styles.btn}
            contentStyle={{ height: 48 }}
          >
            {t("calculate")}
          </Button>
        </Card.Content>
      </Card>

      {bmi && (
        <Card
          style={[styles.resultCard, { borderLeftColor: getCategoryColor() }]}
        >
          <Card.Content style={styles.resultContent}>
            <View>
              <Text variant="titleMedium">{t("your_bmi")}</Text>
              <Text
                variant="displayMedium"
                style={{ color: getCategoryColor(), fontWeight: "bold" }}
              >
                {bmi}
              </Text>
            </View>
            <View style={styles.categoryInfo}>
              <Text variant="titleLarge" style={{ color: getCategoryColor() }}>
                {category}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoHeader}>
            <Info size={20} color="#8A8FA3" />
            <Text variant="titleMedium" style={styles.infoTitle}>
              {t("bmi_info")}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text>{t("underweight")}</Text>
            <Text>&lt; 18.5</Text>
          </View>
          <View style={styles.infoRow}>
            <Text>{t("normal_weight")}</Text>
            <Text>18.5 - 24.9</Text>
          </View>
          <View style={styles.infoRow}>
            <Text>{t("overweight")}</Text>
            <Text>25 - 29.9</Text>
          </View>
          <View style={styles.infoRow}>
            <Text>{t("obese")}</Text>
            <Text>&gt; 30</Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FF" },
  content: { padding: 16 },
  card: { borderRadius: 16, elevation: 2, marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  title: { marginLeft: 12, fontWeight: "bold", color: "#5A5F73" },
  input: { marginBottom: 16 },
  btn: { marginTop: 8, borderRadius: 8, backgroundColor: "#5568FF" },
  resultCard: {
    borderRadius: 16,
    borderLeftWidth: 8,
    marginBottom: 16,
    backgroundColor: "#FFF",
  },
  resultContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  categoryInfo: { alignItems: "flex-end" },
  infoCard: { borderRadius: 16, backgroundColor: "#FFF" },
  infoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  infoTitle: { marginLeft: 8, color: "#8A8FA3" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F6",
  },
});

export default BMICalculatorScreen;
