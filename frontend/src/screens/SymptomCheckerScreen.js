import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from "react-native";
import {
  Text,
  Chip,
  Button,
  Card,
  List,
  Divider,
  Searchbar,
} from "react-native-paper";
import { diagnose, interpretVoiceSymptoms, saveHistoryToDB } from "../api";
import { useAuth } from "../utils/AuthContext";
import { saveToHistory } from "../utils/storage";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Plus,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import VoiceInput from "../components/VoiceInput";
import { speak, stop as stopTts } from "../utils/tts";

const ALL_SYMPTOMS = [
  "fever",
  "cough",
  "headache",
  "dizziness",
];

const SymptomCheckerScreen = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Myanmar to English symptom mapping for voice recognition
  const MYANMAR_SYMPTOM_MAP = {
    နှာချေ: "sneezing",
    နှာစေး: "runny_nose",
    လည်ချောင်းနာ: "sore_throat",
    ချောင်းဆိုး: "cough",
    နှာပိတ်: "congestion",
    ဖျား: "fever",
    ကိုယ်ပူ: "fever",
    ချမ်းတုန်: "chills",
    ကြွက်သားနာ: "muscle_aches",
    ခေါင်းကိုက်: "headache",
    နုံး: "fatigue",
    အဖျားကြီး: "high_fever",
    အဆစ်အမြစ်နာ: "joint_pain",
    အနီစက်: "rash",
    အင်ပြင်: "rash",
    မူး: "dizziness",
    ရင်ဘတ်နာ: "chest_pain",
  };

  const inferSymptomsFromText = (text) => {
    const results = [];
    const cleanedText = (text || "").toLowerCase();
    const parts = cleanedText
      .split(/[\n,;။]+/)
      .map((part) =>
        part
          .replace(/[^a-z0-9\u1000-\u109f\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      )
      .filter(Boolean);

    parts.forEach((part) => {
      if (ALL_SYMPTOMS.includes(part)) {
        results.push(part);
        return;
      }

      const englishAlias = {
        "head ache": "headache",
        headache: "headache",
        fever: "fever",
        cough: "cough",
        "sore throat": "sore throat",
        "runny nose": "runny nose",
        "chest pain": "chest pain",
        "high fever": "high fever",
        "joint pain": "joint pain",
        "muscle aches": "muscle aches",
        rash: "rash",
        fatigue: "fatigue",
        dizziness: "dizziness",
        "shortness of breath": "shortness of breath",
        "stomach pain": "stomach pain",
      };

      if (englishAlias[part]) {
        results.push(englishAlias[part]);
        return;
      }

      const romanizedMatches = {
        konkai: "headache",
        "kon kai": "headache",
        "khon kai": "headache",
        "konkai miri": "headache",
        "kon kai miri": "headache",
        "khon kai miri": "headache",
        "kaung ai": "headache",
        kaungai: "headache",
        "kone kai": "headache",
        "kyaw kai": "headache",
        pyar: "fever",
        pyaar: "fever",
        "pyar nyar": "fever",
        "pyaar nyar": "fever",
        "chaung soe": "cough",
        chaungsoe: "cough",
        "chaung so": "cough",
        "chaung soe lar": "cough",
      };

      if (romanizedMatches[part]) {
        results.push(romanizedMatches[part]);
        return;
      }

      Object.entries(MYANMAR_SYMPTOM_MAP).forEach(([mm, en]) => {
        if (part.includes(mm.toLowerCase())) {
          results.push(en);
        }
      });
    });

    return [...new Set(results)];
  };

  const handleVoiceTranscription = async (text) => {
    const trimmedText = (text || "").trim();
    if (!trimmedText) return;

    try {
      const response = await interpretVoiceSymptoms(trimmedText);
      const interpretedSymptoms = (response.symptoms || [])
        .map((symptom) => symptom.trim().toLowerCase())
        .filter(Boolean);
      const fallbackSymptoms = inferSymptomsFromText(trimmedText);
      const combinedSymptoms = [
        ...new Set([...interpretedSymptoms, ...fallbackSymptoms]),
      ];

      const detectedPredefined = new Set();
      const customSymptoms = [];

      combinedSymptoms.forEach((symptom) => {
        const normalizedSymptom = symptom.replace(/[_\s]+/g, " ").trim();
        const predefinedMatch = ALL_SYMPTOMS.find(
          (item) => item.replace("_", " ") === normalizedSymptom,
        );
        if (predefinedMatch) {
          detectedPredefined.add(predefinedMatch);
          return;
        }

        const isMyanmarMapped = Object.entries(MYANMAR_SYMPTOM_MAP).some(
          ([mm, en]) =>
            normalizedSymptom === en ||
            normalizedSymptom.includes(mm.toLowerCase()) ||
            normalizedSymptom.includes(en),
        );

        if (!isMyanmarMapped && normalizedSymptom) {
          customSymptoms.push(normalizedSymptom);
        }
      });

      setSelectedSymptoms((prev) => {
        const newSelected = new Set(prev);
        detectedPredefined.forEach((item) => newSelected.add(item));
        customSymptoms.forEach((item) => newSelected.add(item));
        return [...newSelected];
      });
    } catch (error) {
      console.error("Voice symptom interpretation failed:", error);

      const lowerText = trimmedText.toLowerCase();
      const fallbackSymptoms = inferSymptomsFromText(lowerText);
      const detectedPredefined = new Set();
      const customSymptoms = [];

      fallbackSymptoms.forEach((symptom) => {
        const normalizedSymptom = symptom.replace(/[_\s]+/g, " ").trim();
        const predefinedMatch = ALL_SYMPTOMS.find(
          (item) => item.replace("_", " ") === normalizedSymptom,
        );
        if (predefinedMatch) {
          detectedPredefined.add(predefinedMatch);
        } else if (normalizedSymptom) {
          customSymptoms.push(normalizedSymptom);
        }
      });

      setSelectedSymptoms((prev) => {
        const newSelected = new Set(prev);
        detectedPredefined.forEach((item) => newSelected.add(item));
        customSymptoms.forEach((item) => newSelected.add(item));
        return [...newSelected];
      });
    }
  };

  const toggleSymptom = (symptom) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const addCustomSymptom = () => {
    if (customSymptom.trim()) {
      // Split by comma or Myanmar comma
      const symptoms = customSymptom
        .split(/[၊,]/)
        .map((s) => s.trim())
        .filter((s) => s !== "");

      const newSelected = [...selectedSymptoms];
      symptoms.forEach((s) => {
        if (!newSelected.includes(s)) {
          newSelected.push(s);
        }
      });

      setSelectedSymptoms(newSelected);
      setCustomSymptom("");
    }
  };

  const stopSpeech = async () => {
    try {
      await stopTts();
      setIsSpeaking(false);
    } catch (error) {
      console.error("Stop speech error:", error);
    }
  };

  const speakResult = async () => {
    if (!result) return;
    
    if (isSpeaking) {
      await stopSpeech();
      return;
    }
    
    const isMM = i18n.language === "mm";
    let speechText = "";
    if (isMM) {
      speechText = `ရောဂါရှာဖွေတွေ့ရှိချက်။ ${result.disease} ဖြစ်နိုင်ပါသည်။ ${result.description}။ `;
      if (result.prevention && result.prevention.length > 0) {
        speechText += `ကြိုတင်ကာကွယ်ရန် နည်းလမ်းများ - ${result.prevention.join("။ ")}။ `;
      }
      if (result.recommendation) {
        speechText += `ဆရာဝန် အကြံပြုချက် - ${result.recommendation}။ `;
      }
      if (result.medications && result.medications.length > 0) {
        speechText += `အထောက်အကူပြု ဆေးဝါးများ - ${result.medications.join("၊ ")}။ `;
      }
    } else {
      speechText = `Diagnosis result: You may have ${result.disease}. ${result.description}. `;
      if (result.prevention && result.prevention.length > 0) {
        speechText += `Prevention: ${result.prevention.join(". ")}. `;
      }
      if (result.recommendation) {
        speechText += `Recommendations: ${result.recommendation}. `;
      }
      if (result.medications && result.medications.length > 0) {
        speechText += `Recommended medications: ${result.medications.join(", ")}. `;
      }
    }
    
    try {
      setIsSpeaking(true);
      await speak(speechText, {
        language: isMM ? 'my' : 'en',
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch (error) {
      console.error("Speech error:", error);
      setIsSpeaking(false);
    }
  };

  const handleDiagnose = async () => {
    if (selectedSymptoms.length === 0) {
      Alert.alert(t("error"), t("select_at_least_one"));
      return;
    }

    setLoading(true);
    try {
      // Map keys back to English for API, keep custom symptoms as is
      const apiSymptoms = selectedSymptoms.map((s) =>
        ALL_SYMPTOMS.includes(s) ? s.replace("_", " ") : s,
      );
      const data = await diagnose(apiSymptoms);
      setResult(data);
      const isMM = i18n.language === "mm";
      const displaySymptoms = selectedSymptoms.map((s) => t(s) || s).join(isMM ? "၊ " : ", ");
      const historyDetails = isMM ? `ရောဂါလက္ခဏာများ: ${displaySymptoms}` : `Symptoms: ${apiSymptoms.join(", ")}`;

      // Save to Local Storage
      await saveToHistory({
        type: "Diagnosis",
        title: data.disease,
        details: historyDetails,
      });
      // Save to Backend Database
      if (user && user.id) {
        await saveHistoryToDB(
          "Diagnosis",
          data.disease,
          historyDetails,
          user.id,
        );
      }
    } catch (error) {
      Alert.alert(t("error"), t("no_match_found"));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {t("what_symptoms")}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t("select_symptoms")}
        </Text>
      </View>

      <View style={styles.inputSection}>
        <Searchbar
          placeholder={
            i18n.language === "mm"
              ? "လက္ခဏာအသစ်ထည့်ရန်..."
              : "Add custom symptom..."
          }
          onChangeText={setCustomSymptom}
          value={customSymptom}
          onIconPress={addCustomSymptom}
          onSubmitEditing={addCustomSymptom}
          icon={() => <Plus size={20} color="#7C8CFF" />}
          style={styles.searchbar}
        />
        <VoiceInput
          onTranscriptionComplete={handleVoiceTranscription}
          placeholderText={t("voice_input_symptoms")}
        />
      </View>

      <View style={styles.chipContainer}>
        {/* Predefined Symptoms */}
        {ALL_SYMPTOMS.map((symptom) => (
          <Chip
            key={symptom}
            selected={selectedSymptoms.includes(symptom)}
            onPress={() => toggleSymptom(symptom)}
            style={styles.chip}
            mode="outlined"
            selectedColor="#7C8CFF"
          >
            {t(symptom)}
          </Chip>
        ))}

        {/* Custom Symptoms */}
        {selectedSymptoms
          .filter((s) => !ALL_SYMPTOMS.includes(s))
          .map((symptom) => (
            <Chip
              key={symptom}
              selected={true}
              onClose={() => toggleSymptom(symptom)}
              style={[styles.chip, styles.customChip]}
              mode="flat"
              selectedColor="#FFF"
            >
              {symptom}
            </Chip>
          ))}
      </View>

      <Button
        mode="contained"
        onPress={handleDiagnose}
        loading={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {t("check_diagnosis")}
      </Button>

      {result && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <View style={styles.resultHeader}>
              <Activity size={24} color="#7C8CFF" />
              <View style={styles.diseaseNameContainer}>
                <Text variant="headlineSmall" style={styles.diseaseName} numberOfLines={2}>
                  {result.disease}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={speakResult} 
                style={styles.speakButton}
                activeOpacity={0.7}
              >
                {isSpeaking 
                  ? <VolumeX size={20} color="#FFFFFF" style={{ color: '#FFFFFF' }} /> 
                  : <Volume2 size={20} color="#FFFFFF" style={{ color: '#FFFFFF' }} />
                }
              </TouchableOpacity>
            </View>

            <Text variant="bodyLarge" style={styles.description}>
              {result.description}
            </Text>

            <Divider style={styles.divider} />

            {(result.prevention || result.precautions) && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ShieldAlert size={20} color="#A8E6CF" />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("prevention")}
                  </Text>
                </View>
                {(result.prevention || result.precautions || []).map((item, i) => (
                  <View key={i} style={styles.listItem}>
                    <CheckCircle2 size={16} color="#A8E6CF" />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {result.recommendation ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <AlertCircle size={20} color="#FFDAC1" />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("recommendation")}
                  </Text>
                </View>
                <Text style={styles.recommendationText}>
                  {result.recommendation}
                </Text>
              </View>
            ) : null}

            {result.medications && result.medications.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("medications")}
                  </Text>
                </View>
                <View style={styles.medicationContainer}>
                  {(result.medications || []).map((med, i) => (
                    <Chip key={i} style={styles.medChip} textStyle={styles.medChipText}>
                      {med}
                    </Chip>
                  ))}
                </View>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      )}
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
    paddingBottom: 8,
  },
  title: {
    fontWeight: "bold",
    color: "#5A5F73",
  },
  subtitle: {
    color: "#8A8FA3",
    marginTop: 8,
  },
  inputSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
  },
  chip: {
    margin: 4,
  },
  customChip: {
    backgroundColor: "#7C8CFF",
  },
  button: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: "#7C8CFF",
  },
  buttonContent: {
    paddingVertical: 8,
  },
  resultCard: {
    margin: 16,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: "#FFF",
    marginBottom: 40,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    justifyContent: "space-between",
  },
  speakButton: {
    flexShrink: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C8CFF',
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#7C8CFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  diseaseNameContainer: {
    marginLeft: 12,
    flex: 1,
    flexShrink: 1,
  },
  diseaseName: {
    fontWeight: "bold",
    color: "#7C8CFF",
  },
  description: {
    color: "#6A6F85",
    lineHeight: 24,
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    marginLeft: 8,
    fontWeight: "bold",
    color: "#5A5F73",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingLeft: 4,
  },
  listText: {
    marginLeft: 10,
    color: "#555",
    flex: 1,
  },
  recommendationText: {
    color: "#555",
    lineHeight: 20,
    paddingLeft: 4,
  },
  medicationContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 4,
  },
  medChip: {
    margin: 3,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  medChipText: {
    fontSize: 12,
    color: "#3730A3",
    fontWeight: "600",
  },
});

export default SymptomCheckerScreen;