import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Text, TextInput } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { Activity, FileText, Heart, Send } from "lucide-react-native";
import { COLORS, FONTS, SHADOWS } from "../utils/theme";
import { clinicalDecisionSupport } from "../api";
import { useAuth } from "../utils/AuthContext";
import VoiceInput from "../components/VoiceInput";

const symptomOptions = [
  { label: "ဖျား", value: "Fever" },
  { label: "ချောင်းဆိုး", value: "Cough" },
  { label: "ရင်နာ", value: "Chest pain" },
  { label: "ခေါင်းကိုက်", value: "Headache" },
  { label: "မူးဝေခြင်း", value: "Dizziness" },
  { label: "အသက်ရှူခက်ခြင်း", value: "Shortness of breath" },
  { label: "အန်ခြင်း", value: "Vomiting" },
  { label: "ဗိုက်နာ", value: "Abdominal pain" },
];

const followUpQuestions = [
  "When did the symptoms start?",
  "How severe is the symptom from 1 to 10?",
  "Do you have chest pain, breathing difficulty, fainting, or confusion?",
  "What medicines are you currently taking?",
  "Do you have diabetes, hypertension, pregnancy, asthma, or heart disease?",
];

const questionTranslationMap = {
  "When did the symptoms start?": "clinical_question_when_start",
  "How severe is the pain or discomfort from 1 to 10?":
    "clinical_question_severity",
  "How severe is the symptom from 1 to 10?": "clinical_question_severity",
  "Do you have any long-term illness or current medicines?":
    "clinical_question_long_term",
  "Do you have diabetes, hypertension, pregnancy, asthma, or heart disease?":
    "clinical_question_long_term",
  "Is there chest pain, breathing difficulty, fainting, or confusion?":
    "clinical_question_red_flags",
  "Do you have chest pain, breathing difficulty, fainting, or confusion?":
    "clinical_question_red_flags",
  "What medicines are you currently taking?": "clinical_question_medicines",
};

const ClinicalDecisionSupportScreen = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedSymptoms, setSelectedSymptoms] = useState(["Fever"]);
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVoiceTranscription = (text) => {
    // First, set the draft to the transcribed text for the current answer
    setDraft(text);

    // Now try to detect symptoms in the text to auto-select them
    const lowerText = text.toLowerCase();
    const detectedSymptoms = [];

    symptomOptions.forEach((symptom) => {
      const symptomLower = symptom.value.toLowerCase();
      const symptomLabelLower = symptom.label.toLowerCase();
      if (lowerText.includes(symptomLower) || lowerText.includes(symptomLabelLower)) {
        detectedSymptoms.push(symptom.value);
      }
    });

    if (detectedSymptoms.length > 0) {
      setSelectedSymptoms((prev) => {
        const newSet = new Set([...prev, ...detectedSymptoms]);
        return Array.from(newSet);
      });
    }
  };

  const toggleSymptom = (symptom) => {
    setSelectedSymptoms((items) =>
      items.includes(symptom)
        ? items.filter((item) => item !== symptom)
        : [...items, symptom],
    );
  };

  const saveAnswer = () => {
    if (!draft.trim()) return;
    setAnswers((items) => ({
      ...items,
      [followUpQuestions[currentQuestion]]: draft.trim(),
    }));
    setDraft("");
    setCurrentQuestion((value) =>
      Math.min(value + 1, followUpQuestions.length - 1),
    );
  };

  const runClinicalAgents = async () => {
    try {
      setLoading(true);
      const response = await clinicalDecisionSupport({
        symptoms: selectedSymptoms,
        answers,
        user_profile: {
          id: user?.id,
          name: user?.name,
          height: user?.height,
          weight: user?.weight,
          blood_pressure: user?.blood_pressure,
        },
      });
      setResult(response);
      if (response.next_questions?.length) {
        const nextIndex = followUpQuestions.findIndex(
          (question) => question === response.next_questions[0],
        );
        if (nextIndex >= 0) setCurrentQuestion(nextIndex);
      }
    } catch (error) {
      Alert.alert(
        "Clinical Support Error",
        error.response?.data?.detail || error.message,
      );
    } finally {
      setLoading(false);
    }
  };

  const triageColor =
    result?.triage === "urgent"
      ? COLORS.danger
      : result?.triage === "doctor_consult"
        ? COLORS.orange
        : COLORS.secondary;

  const selectedSymptomLabels = selectedSymptoms.map(
    (value) =>
      symptomOptions.find((option) => option.value === value)?.label || value,
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.heroCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <Activity size={34} color={COLORS.aiDoctor} />
            <View style={styles.titleText}>
              <Text variant="headlineSmall" style={styles.title}>
                {t("clinical_decision_support_screen_title")}
              </Text>
              <Text style={styles.subtitle}>
                {t("clinical_decision_support_screen_subtitle")}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t("clinical_symptoms_section")}
          </Text>
          <View style={styles.chipWrap}>
            {symptomOptions.map((symptom) => (
              <Chip
                key={symptom.value}
                selected={selectedSymptoms.includes(symptom.value)}
                onPress={() => toggleSymptom(symptom.value)}
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {symptom.label}
              </Chip>
            ))}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.questionHeader}>
            <Heart size={22} color={COLORS.danger} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("clinical_agent_followup")}
            </Text>
          </View>
          <Text style={styles.question}>
            {t(questionTranslationMap[followUpQuestions[currentQuestion]])}
          </Text>
          <TextInput
            mode="outlined"
            value={draft}
            onChangeText={setDraft}
            placeholder={t("clinical_answer_placeholder")}
            multiline
            style={styles.input}
          />
          <VoiceInput
            onTranscriptionComplete={handleVoiceTranscription}
            placeholderText={t("voice_input_placeholder")}
          />
          <Button
            mode="contained"
            icon={() => <Send size={18} color="#FFF" />}
            onPress={saveAnswer}
            style={styles.primaryButton}
          >
            {t("clinical_save_answer")}
          </Button>
          <Button
            mode="outlined"
            onPress={runClinicalAgents}
            loading={loading}
            disabled={loading || selectedSymptoms.length === 0}
            style={styles.secondaryButton}
          >
            {t("clinical_run_agents")}
          </Button>
        </Card.Content>
      </Card>

      <Card style={[styles.card, { borderLeftColor: triageColor }]}>
        <Card.Content>
          <View style={styles.questionHeader}>
            <FileText size={22} color={triageColor} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("clinical_summary")}
            </Text>
          </View>
          <Text style={[styles.triageLabel, { color: triageColor }]}>
            {result?.triage ? (
              result.triage === "urgent" ? t("triage_urgent") : 
              result.triage === "doctor_consult" ? t("triage_doctor_consult") : 
              result.triage === "self_care" ? t("triage_self_care") :
              result.triage
            ) : t("clinical_not_analyzed_yet")}
          </Text>
          <Text style={styles.summaryText}>
            {result?.recommendation || t("clinical_no_triage")}
          </Text>
          {result?.risk_score !== undefined && (
            <Text style={styles.summaryText}>
              {t("clinical_risk_score")}: {result.risk_score}/100
            </Text>
          )}
          {result?.red_flags?.length > 0 && (
            <Text style={[styles.summaryText, { color: COLORS.danger }]}>
              {t("clinical_red_flags_label")}: {result.red_flags.join(", ")}
            </Text>
          )}
          <Text style={styles.summaryText}>
            {t("clinical_symptoms_label")}: {selectedSymptomLabels.join(", ") || "None selected"}
          </Text>
          {result?.candidate_conditions?.map((condition) => (
            <View key={condition.name} style={styles.answerRow}>
              <Text style={styles.answerQuestion}>
                {condition.name} ({condition.score})
              </Text>
              <Text style={styles.answerText}>{condition.recommendation}</Text>
            </View>
          ))}
          {result?.next_questions?.length > 0 && (
            <View style={styles.answerRow}>
              <Text style={styles.answerQuestion}>
                {t("clinical_next_questions")}
              </Text>
              {result.next_questions.map((question) => (
                <Text key={question} style={styles.answerText}>
                  {t(questionTranslationMap[question] || question)}
                </Text>
              ))}
            </View>
          )}
          {Object.entries(answers).map(([question, answer]) => (
            <View key={question} style={styles.answerRow}>
              <Text style={styles.answerQuestion}>
                {t(questionTranslationMap[question] || question)}
              </Text>
              <Text style={styles.answerText}>{answer}</Text>
            </View>
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
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  titleRow: { flexDirection: "row", alignItems: "center" },
  titleText: { flex: 1, marginLeft: 14 },
  title: { ...FONTS.bold, color: COLORS.textPrimary },
  subtitle: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    marginBottom: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.aiDoctor,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: { ...FONTS.bold, color: COLORS.textPrimary },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  chip: { marginRight: 8, marginBottom: 8 },
  chipText: FONTS.regular,
  questionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  question: { ...FONTS.regular, color: COLORS.textPrimary, marginTop: 12 },
  input: { marginTop: 12, backgroundColor: COLORS.surface, ...FONTS.regular },
  primaryButton: {
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: COLORS.aiDoctor,
  },
  secondaryButton: { marginTop: 10, borderRadius: 8 },
  triageLabel: { ...FONTS.bold, fontSize: 18, marginTop: 8 },
  summaryText: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 8 },
  answerRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  answerQuestion: { ...FONTS.bold, color: COLORS.textPrimary },
  answerText: { ...FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
});

export default ClinicalDecisionSupportScreen;
