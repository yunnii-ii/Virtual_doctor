import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View, TouchableOpacity, Keyboard } from "react-native";
import { Button, Card, Chip, Text, TextInput, Divider, Badge } from "react-native-paper";
import { useTranslation } from "react-i18next";
import {
  Activity,
  FileText,
  Heart,
  Send,
  Plus,
  X,
  Sparkles,
  Stethoscope,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Search,
  Pill,
  ShieldAlert,
  Ban,
  Check,
  Clock,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react-native";
import { COLORS, FONTS, SHADOWS } from "../utils/theme";
import { clinicalDecisionSupport } from "../api";
import { useAuth } from "../utils/AuthContext";
import VoiceInput from "../components/VoiceInput";
import { speak, stop as stopTts } from "../utils/tts";

const QUICK_SYMPTOM_SUGGESTIONS = [
  { key: "fever", en: "Fever", mm: "ဖျားခြင်း" },
  { key: "cough", en: "Cough", mm: "ချောင်းဆိုးခြင်း" },
  { key: "headache", en: "Headache", mm: "ခေါင်းကိုက်ခြင်း" },
  { key: "dizziness", en: "Dizziness", mm: "မူးဝေခြင်း" },

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
  "How severe is the pain or discomfort from 1 to 10?": "clinical_question_severity",
  "How severe is the symptom from 1 to 10?": "clinical_question_severity",
  "Do you have any long-term illness or current medicines?": "clinical_question_long_term",
  "Do you have diabetes, hypertension, pregnancy, asthma, or heart disease?": "clinical_question_long_term",
  "Is there chest pain, breathing difficulty, fainting, or confusion?": "clinical_question_red_flags",
  "Do you have chest pain, breathing difficulty, fainting, or confusion?": "clinical_question_red_flags",
  "What medicines are you currently taking?": "clinical_question_medicines",
};

const ClinicalDecisionSupportScreen = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === "mm";

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [customSymptomInput, setCustomSymptomInput] = useState("");
  const [answers, setAnswers] = useState({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showPatientHistory, setShowPatientHistory] = useState(false);

  // Helper to display symptom in current language
  const getSymptomDisplay = (symptom) => {
    const match = QUICK_SYMPTOM_SUGGESTIONS.find(
      (item) =>
        item.key === symptom ||
        item.en.toLowerCase() === symptom.toLowerCase() ||
        item.mm === symptom
    );
    if (match) {
      return isMM ? match.mm : match.en;
    }
    const translated = t(symptom);
    if (translated && translated !== symptom) return translated;
    return symptom;
  };

  // Add custom symptom(s) from input box
  const handleAddCustomSymptom = (textToAdd) => {
    const rawText = typeof textToAdd === "string" ? textToAdd : customSymptomInput;
    if (!rawText || !rawText.trim()) return;

    // Split by commas or Burmese commas
    const parts = rawText
      .split(/[,၊;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      setSelectedSymptoms((prev) => {
        const unique = new Set([...prev, ...parts]);
        return Array.from(unique);
      });
      setCustomSymptomInput("");
      Keyboard.dismiss();
    }
  };

  // Toggle predefined quick suggestion chip
  const toggleSymptom = (item) => {
    const symptomVal = isMM ? item.mm : item.en;
    setSelectedSymptoms((prev) => {
      const exists = prev.some(
        (s) => s === item.key || s === item.en || s === item.mm
      );
      if (exists) {
        return prev.filter(
          (s) => s !== item.key && s !== item.en && s !== item.mm
        );
      } else {
        return [...prev, symptomVal];
      }
    });
  };

  // Remove individual symptom chip
  const removeSymptom = (symptomToRemove) => {
    const match = QUICK_SYMPTOM_SUGGESTIONS.find(
      (item) =>
        item.key === symptomToRemove ||
        item.en === symptomToRemove ||
        item.mm === symptomToRemove
    );
    if (match) {
      setSelectedSymptoms((prev) =>
        prev.filter(
          (s) => s !== match.key && s !== match.en && s !== match.mm
        )
      );
    } else {
      setSelectedSymptoms((prev) => prev.filter((s) => s !== symptomToRemove));
    }
  };

  // Clear all symptoms
  const handleClearAllSymptoms = () => {
    setSelectedSymptoms([]);
    setCustomSymptomInput("");
  };

  const handleVoiceTranscription = (text) => {
    setDraft(text);
    const lowerText = text.toLowerCase();
    const detected = [];

    QUICK_SYMPTOM_SUGGESTIONS.forEach((symptom) => {
      const valLower = symptom.en.toLowerCase();
      const lblLower = symptom.mm.toLowerCase();
      const keyLower = symptom.key.toLowerCase();
      if (
        lowerText.includes(valLower) ||
        lowerText.includes(lblLower) ||
        lowerText.includes(keyLower)
      ) {
        detected.push(isMM ? symptom.mm : symptom.en);
      }
    });

    if (detected.length > 0) {
      setSelectedSymptoms((prev) => Array.from(new Set([...prev, ...detected])));
    }
  };

  const saveAnswer = () => {
    if (!draft.trim()) return;
    setAnswers((items) => ({
      ...items,
      [followUpQuestions[currentQuestion]]: draft.trim(),
    }));
    setDraft("");
    setCurrentQuestion((value) =>
      Math.min(value + 1, followUpQuestions.length - 1)
    );
  };

  const stopSpeech = async () => {
    try {
      await stopTts();
      setIsSpeaking(false);
    } catch (e) {
      console.log("TTS stop error:", e);
    }
  };

  const speakClinicalSummary = async () => {
    if (!result) return;
    if (isSpeaking) {
      await stopSpeech();
      return;
    }

    let speech = "";
    if (isMM) {
      speech = `ဆေးဘက်ဆိုင်ရာ ခွဲခြမ်းစိတ်ဖြာချက် အကျဉ်းချုပ်။ အန္တရာယ်အဆင့် - ${result.triage === "urgent"
        ? "အလွန်အရေးပေါ် ဆေးရုံပြသရန်"
        : result.triage === "doctor_consult"
          ? "ဆရာဝန်နှင့် ပြသဆွေးနွေးရန်"
          : "အိမ်တွင်း စောင့်ရှောက်နိုင်သည်"
        }။ `;

      if (result.action_plan && result.action_plan.length > 0) {
        speech += "လုပ်ဆောင်သင့်သည့် အချက်များမှာ - " + result.action_plan.slice(0, 2).join("။ ") + "။ ";
      }

      if (result.recommended_medications && result.recommended_medications.length > 0) {
        speech += "သောက်သုံးနိုင်သော ဆေးဝါးများမှာ - " + result.recommended_medications.map(m => m.name).join(", ") + " ဖြစ်ပါသည်။ ";
      }

      if (result.things_to_avoid && result.things_to_avoid.length > 0) {
        speech += "ရှောင်ကြဉ်ရမည့် အချက်မှာ - " + result.things_to_avoid[0] + "။";
      }
    } else {
      speech = `Clinical assessment complete. Triage status: ${result.triage}. ${result.recommendation || ""}. `;
      if (result.action_plan?.length > 0) {
        speech += `Key action: ${result.action_plan[0]}. `;
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
    } catch (error) {
      console.log("TTS speak error:", error);
      setIsSpeaking(false);
    }
  };

  const runClinicalAgents = async () => {
    // Automatically include any unsubmitted custom symptoms or draft answers
    let activeSymptoms = [...selectedSymptoms];
    if (customSymptomInput.trim()) {
      const parts = customSymptomInput
        .split(/[,၊;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      activeSymptoms = Array.from(new Set([...activeSymptoms, ...parts]));
      setSelectedSymptoms(activeSymptoms);
      setCustomSymptomInput("");
    }

    let currentAnswers = { ...answers };
    if (draft.trim()) {
      currentAnswers[followUpQuestions[currentQuestion]] = draft.trim();
      setAnswers(currentAnswers);
      setDraft("");
    }

    if (activeSymptoms.length === 0 && Object.keys(currentAnswers).length === 0) {
      Alert.alert(
        isMM ? "သတိပေးချက်" : "Notice",
        isMM
          ? "လက္ခဏာတစ်ခုခု ရိုက်ထည့်ပါ သို့မဟုတ် အမြန်ရွေးချယ်မှုမှ ရွေးပေးပါ။"
          : "Please type or select at least one symptom to run clinical agents."
      );
      return;
    }

    const normalizedSymptoms = activeSymptoms.map((symptom) => {
      const match = QUICK_SYMPTOM_SUGGESTIONS.find(
        (item) =>
          item.key === symptom ||
          item.en.toLowerCase() === symptom.toLowerCase() ||
          item.mm === symptom
      );
      return match ? match.en : symptom;
    });

    try {
      setLoading(true);
      Keyboard.dismiss();
      const response = await clinicalDecisionSupport({
        symptoms: normalizedSymptoms,
        answers: currentAnswers,
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
          (question) => question === response.next_questions[0]
        );
        if (nextIndex >= 0) setCurrentQuestion(nextIndex);
      }
    } catch (error) {
      Alert.alert(
        "Clinical Support Error",
        error.response?.data?.detail || error.message
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

  const canRunAgents =
    selectedSymptoms.length > 0 ||
    customSymptomInput.trim().length > 0 ||
    draft.trim().length > 0 ||
    Object.keys(answers).length > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Hero Header Card */}
      <Card style={styles.heroCard}>
        <Card.Content>
          <View style={styles.titleRow}>
            <View style={styles.heroIconBg}>
              <Stethoscope size={30} color={COLORS.aiDoctor} />
            </View>
            <View style={styles.titleText}>
              <Text variant="titleMedium" style={styles.title}>
                {t("clinical_decision_support_screen_title")}
              </Text>
              <Text style={styles.subtitle}>
                {t("clinical_decision_support_screen_subtitle")}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* SECTION 1: Symptom Input & Active Symptoms */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Activity size={20} color={COLORS.aiDoctor} />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t("clinical_symptoms_section")}
              </Text>
            </View>
            {selectedSymptoms.length > 0 && (
              <TouchableOpacity onPress={handleClearAllSymptoms}>
                <Text style={styles.clearText}>{t("clear_all_symptoms")}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Custom Symptom Text Input (စာရိုက်ထည့်ရန် အကွက်) */}
          <Text style={styles.inputHelperText}>
            ✍️ {t("type_custom_symptom_hint")}
          </Text>
          <View style={styles.typeInputRow}>
            <TextInput
              mode="outlined"
              value={customSymptomInput}
              onChangeText={setCustomSymptomInput}
              placeholder={t("custom_symptom_placeholder")}
              onSubmitEditing={() => handleAddCustomSymptom()}
              returnKeyType="done"
              style={styles.customTextInput}
              outlineStyle={styles.textInputOutline}
              dense
            />
            <Button
              mode="contained"
              onPress={() => handleAddCustomSymptom()}
              style={styles.addButton}
              labelStyle={styles.addButtonLabel}
              disabled={!customSymptomInput.trim()}
            >
              {t("add_symptom")}
            </Button>
          </View>

          {/* Active / Added Symptoms List (ထည့်ထားသော လက္ခဏာများ) */}
          <View style={styles.activeSymptomsContainer}>
            <Text style={styles.subHeading}>
              {t("selected_symptoms_title")} ({selectedSymptoms.length}) :
            </Text>
            {selectedSymptoms.length === 0 ? (
              <Text style={styles.emptySymptomsText}>
                {t("no_symptoms_added")}
              </Text>
            ) : (
              <View style={styles.activeChipWrap}>
                {selectedSymptoms.map((symptom, idx) => (
                  <Chip
                    key={`active-${idx}-${symptom}`}
                    onClose={() => removeSymptom(symptom)}
                    style={styles.activeChip}
                    textStyle={styles.activeChipText}
                    closeIcon={() => <X size={14} color="#FFF" />}
                  >
                    {getSymptomDisplay(symptom)}
                  </Chip>
                ))}
              </View>
            )}
          </View>

          <Divider style={styles.divider} />

          {/* Quick Suggestions Chips */}
          <Text style={styles.subHeading}>
            ⚡ {t("quick_symptom_suggestions")} :
          </Text>
          <View style={styles.chipWrap}>
            {QUICK_SYMPTOM_SUGGESTIONS.map((item) => {
              const isSelected = selectedSymptoms.some(
                (s) => s === item.key || s === item.en || s === item.mm
              );
              const displayLabel = isMM ? item.mm : item.en;
              return (
                <Chip
                  key={item.key}
                  selected={isSelected}
                  onPress={() => toggleSymptom(item)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  textStyle={[styles.chipText, isSelected && styles.chipTextSelected]}
                  showSelectedOverlay
                >
                  {displayLabel}
                </Chip>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      {/* SECTION 2: Doctor-Style Follow-Up Interview */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.questionHeader}>
            <Heart size={20} color={COLORS.danger} />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("clinical_agent_followup")}
            </Text>
          </View>
          <Text style={styles.question}>
            {t(questionTranslationMap[followUpQuestions[currentQuestion]] || followUpQuestions[currentQuestion])}
          </Text>
          <TextInput
            mode="outlined"
            value={draft}
            onChangeText={setDraft}
            placeholder={t("clinical_answer_placeholder")}
            multiline
            style={styles.input}
            outlineStyle={styles.textInputOutline}
          />
          <VoiceInput
            onTranscriptionComplete={handleVoiceTranscription}
            placeholderText={t("voice_input_placeholder")}
          />

          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              icon={() => <Send size={16} color="#FFF" />}
              onPress={saveAnswer}
              style={styles.saveAnswerButton}
              labelStyle={styles.btnLabel}
              disabled={!draft.trim()}
            >
              {t("clinical_save_answer")}
            </Button>
          </View>

          {/* Main Action: Run Clinical Decision Agents */}
          <Button
            mode="contained"
            onPress={runClinicalAgents}
            loading={loading}
            disabled={loading || !canRunAgents}
            style={[styles.runAgentsButton, !canRunAgents && styles.btnDisabled]}
            labelStyle={styles.runAgentsLabel}
            icon={() => <Sparkles size={20} color="#FFF" />}
          >
            {t("clinical_run_agents")}
          </Button>
        </Card.Content>
      </Card>

      {/* SECTION 3: Intelligent AI Clinical Decision Guidance & Action Plan */}
      {result && (
        <Card style={[styles.card, { borderLeftColor: triageColor, borderLeftWidth: 6 }]}>
          <Card.Content>
            {/* Header & Voice Speaker */}
            <View style={styles.summaryHeaderRow}>
              <View style={styles.questionHeader}>
                <FileText size={22} color={triageColor} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  {t("clinical_summary")}
                </Text>
              </View>
              <TouchableOpacity
                onPress={speakClinicalSummary}
                style={[styles.speakBtn, { backgroundColor: triageColor }]}
                activeOpacity={0.8}
                accessibilityLabel="Listen to summary"
              >
                {isSpeaking ? <VolumeX size={18} color="#FFF" /> : <Volume2 size={18} color="#FFF" />}
              </TouchableOpacity>
            </View>

            {/* Triage Banner */}
            <View style={[styles.triageBanner, { backgroundColor: triageColor + "15", borderColor: triageColor }]}>
              <Text style={[styles.triageLabel, { color: triageColor }]}>
                {result.triage === "urgent"
                  ? (isMM ? "🚨 အရေးပေါ် ဆရာဝန်ပြသရန် (Urgent)" : "🚨 Urgent Medical Review Needed")
                  : result.triage === "doctor_consult"
                    ? (isMM ? "🩺 ဆရာဝန်နှင့် ပြသဆွေးနွေးရန် (Doctor Consult)" : "🩺 Doctor Consultation Recommended")
                    : (isMM ? "🌱 အိမ်တွင်း စောင့်ရှောက်မှု (Self-care)" : "🌱 Self-Care & Monitoring")}
              </Text>
              {result.risk_score !== undefined && (
                <Text style={[styles.riskScoreText, { color: triageColor }]}>
                  {t("clinical_risk_score")}: {result.risk_score} / 100
                </Text>
              )}
            </View>

            {/* Doctor Clinical Assessment Narrative (ChatGPT-Style Consultation Note) */}
            {result.clinical_narrative ? (
              <View style={styles.narrativeCard}>
                <View style={styles.narrativeHeaderRow}>
                  <Stethoscope size={18} color={COLORS.aiDoctor} />
                  <Text style={styles.narrativeTitle}>
                    {isMM ? "ဆရာဝန် သုံးသပ်ချက် (Doctor's Assessment)" : "Doctor's Clinical Assessment"}
                  </Text>
                </View>
                <Text style={styles.narrativeText}>
                  {result.clinical_narrative}
                </Text>
              </View>
            ) : null}

            {/* Red Flags Alert if detected */}
            {result.red_flags?.length > 0 && (
              <View style={styles.redFlagsBox}>
                <AlertTriangle size={20} color={COLORS.danger} />
                <View style={styles.redFlagsTextWrap}>
                  <Text style={styles.redFlagsTitle}>
                    {isMM ? "အရေးပေါ် အနီအလင်း သတိပေးချက်များ :" : "Emergency Red Flags Detected :"}
                  </Text>
                  <Text style={styles.redFlagsContent}>
                    {result.red_flags.join(", ")}
                  </Text>
                </View>
              </View>
            )}

            {/* 1. ဘာတွေလုပ်သင့်တယ် (ACTION PLAN) */}
            {result.action_plan && result.action_plan.length > 0 && (
              <View style={styles.planBlock}>
                <View style={styles.planBlockHeader}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <Text style={styles.planBlockTitle}>
                    {isMM ? "၁။ ဘာတွေ လုပ်ဆောင်သင့်သနည်း (Action Plan)" : "1. Immediate Steps To Take"}
                  </Text>
                </View>
                <View style={styles.planItemsContainer}>
                  {result.action_plan.map((step, idx) => (
                    <View key={`step-${idx}`} style={styles.planItemRow}>
                      <View style={styles.greenDot} />
                      <Text style={styles.planItemText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 2. ဘာဆေးတွေ သောက်သုံးနိုင်တယ် (RECOMMENDED MEDICATIONS) */}
            {result.recommended_medications && result.recommended_medications.length > 0 && (
              <View style={styles.planBlock}>
                <View style={styles.planBlockHeader}>
                  <Pill size={18} color={COLORS.aiDoctor} />
                  <Text style={styles.planBlockTitle}>
                    {isMM ? "၂။ သောက်သုံးနိုင်သော ဆေးဝါးများနှင့် သောက်သုံးပုံ" : "2. Recommended Over-The-Counter Medications"}
                  </Text>
                </View>
                {result.recommended_medications.map((med, idx) => (
                  <View key={`med-${idx}`} style={styles.medicationCard}>
                    <View style={styles.medNameRow}>
                      <Text style={styles.medNameText}>💊 {med.name}</Text>
                    </View>
                    <View style={styles.medDetailRow}>
                      <Clock size={14} color="#64748B" style={{ marginTop: 2 }} />
                      <Text style={styles.medDetailText}>
                        <Text style={styles.medDetailLabel}>{isMM ? "သောက်သုံးပုံ: " : "Dosage: "}</Text>
                        {med.dosage}
                      </Text>
                    </View>
                    {med.purpose ? (
                      <View style={styles.medDetailRow}>
                        <Info size={14} color="#0284C7" style={{ marginTop: 2 }} />
                        <Text style={styles.medDetailText}>
                          <Text style={styles.medDetailLabel}>{isMM ? "အာနိသင်: " : "Purpose: "}</Text>
                          {med.purpose}
                        </Text>
                      </View>
                    ) : null}
                    {med.precaution ? (
                      <View style={styles.medPrecautionBox}>
                        <Text style={styles.medPrecautionText}>
                          ⚠️ {isMM ? "သတိပြုရန်: " : "Precaution: "} {med.precaution}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {/* 3. ဘာတွေ ရှောင်သင့်တယ် (THINGS TO AVOID) */}
            {result.things_to_avoid && result.things_to_avoid.length > 0 && (
              <View style={[styles.planBlock, styles.avoidBlock]}>
                <View style={styles.planBlockHeader}>
                  <Ban size={18} color="#E11D48" />
                  <Text style={[styles.planBlockTitle, { color: "#BE123C" }]}>
                    {isMM ? "၃။ ဘာတွေ ရှောင်ကြဉ်သင့်သနည်း (Things to Avoid)" : "3. Precautions & Things to Avoid"}
                  </Text>
                </View>
                <View style={styles.planItemsContainer}>
                  {result.things_to_avoid.map((avoidItem, idx) => (
                    <View key={`avoid-${idx}`} style={styles.planItemRow}>
                      <Text style={styles.avoidBullet}>🚫</Text>
                      <Text style={styles.avoidItemText}>{avoidItem}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 4. အရေးပေါ် ဆေးရုံပြသရန် သတိပေးချက်များ (EMERGENCY WARNINGS) */}
            {result.emergency_warnings && result.emergency_warnings.length > 0 && (
              <View style={[styles.planBlock, styles.emergencyBlock]}>
                <View style={styles.planBlockHeader}>
                  <ShieldAlert size={18} color="#DC2626" />
                  <Text style={[styles.planBlockTitle, { color: "#991B1B" }]}>
                    {isMM ? "၄။ အရေးပေါ် ဆေးရုံပြသရမည့် အခြေအနေများ" : "4. When to Seek Emergency Hospital Care"}
                  </Text>
                </View>
                <View style={styles.planItemsContainer}>
                  {result.emergency_warnings.map((warn, idx) => (
                    <View key={`warn-${idx}`} style={styles.planItemRow}>
                      <Text style={styles.emergencyBullet}>🚨</Text>
                      <Text style={styles.emergencyItemText}>{warn}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 5. ဖြစ်နိုင်ချေရှိသော ရောဂါများ (DIFFERENTIAL DIAGNOSES) */}
            {result.candidate_conditions && result.candidate_conditions.length > 0 && (
              <View style={styles.candidateSection}>
                <View style={styles.candidateHeadingRow}>
                  <Text style={styles.candidateHeading}>
                    {isMM ? "၅။ ဖြစ်နိုင်ချေရှိသော ရောဂါများ (Differential Diagnosis)" : "5. Possible Conditions"}
                  </Text>
                </View>
                <Text style={styles.candidateSubtitle}>
                  {t("clinical_candidate_conditions_desc")}
                </Text>

                {result.candidate_conditions.map((condition, idx) => (
                  <View key={`cond-${idx}-${condition.name}`} style={styles.candidateCard}>
                    <View style={styles.candidateTitleRow}>
                      <Text style={styles.candidateName}>
                        {idx + 1}. {condition.name}
                      </Text>
                      {condition.likelihood ? (
                        <View style={styles.likelihoodBadge}>
                          <Text style={styles.likelihoodBadgeText}>
                            {condition.likelihood}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {condition.reason ? (
                      <Text style={styles.candidateReason}>
                        💡 {condition.reason}
                      </Text>
                    ) : null}
                    {condition.description ? (
                      <Text style={styles.candidateDesc}>{condition.description}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            {/* 6. လူနာ အမေးအဖြေ မှတ်တမ်း (PATIENT INTAKE SUMMARY - Collapsible) */}
            {Object.keys(answers).length > 0 && (
              <View style={styles.historySection}>
                <TouchableOpacity
                  style={styles.historyToggleRow}
                  onPress={() => setShowPatientHistory(!showPatientHistory)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.historyHeading}>
                    📋 {isMM ? "လူနာ ဖြေကြားချက် မှတ်တမ်း" : "Patient Intake Responses"} ({Object.keys(answers).length})
                  </Text>
                  {showPatientHistory ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
                </TouchableOpacity>

                {showPatientHistory && (
                  <View style={styles.historyContent}>
                    {Object.entries(answers).map(([q, ans], aIdx) => (
                      <View key={`ans-${aIdx}`} style={styles.answerRow}>
                        <Text style={styles.answerQuestion}>
                          {t(questionTranslationMap[q] || q)}
                        </Text>
                        <Text style={styles.answerText}>{ans}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  heroCard: {
    marginBottom: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  heroIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.aiDoctor + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    flex: 1,
    marginLeft: 14
  },
  title: {
    ...FONTS.bold,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  subtitle: {
    ...FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 3,
    fontSize: 12,
  },
  card: {
    marginBottom: 14,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.aiDoctor,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    ...FONTS.bold,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  clearText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: "600",
  },
  inputHelperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  typeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  customTextInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    fontSize: 13,
  },
  textInputOutline: {
    borderRadius: 10,
    borderColor: COLORS.border || "#E2E8F0",
  },
  addButton: {
    borderRadius: 10,
    backgroundColor: COLORS.aiDoctor,
    height: 44,
    justifyContent: "center",
  },
  addButtonLabel: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  activeSymptomsContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  subHeading: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptySymptomsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  activeChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  activeChip: {
    backgroundColor: COLORS.aiDoctor,
    borderRadius: 16,
  },
  activeChipText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  divider: {
    marginVertical: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  chip: {
    backgroundColor: "#F1F5F9",
    borderRadius: 16,
  },
  chipSelected: {
    backgroundColor: COLORS.aiDoctor + "25",
    borderWidth: 1,
    borderColor: COLORS.aiDoctor,
  },
  chipText: {
    ...FONTS.regular,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  chipTextSelected: {
    color: COLORS.aiDoctor,
    fontWeight: "bold",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  question: {
    ...FONTS.medium,
    color: COLORS.textPrimary,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    marginTop: 10,
    backgroundColor: COLORS.surface,
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  saveAnswerButton: {
    borderRadius: 8,
    backgroundColor: COLORS.aiDoctor,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  runAgentsButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: COLORS.aiDoctor,
    height: 48,
    justifyContent: "center",
    elevation: 3,
  },
  runAgentsLabel: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "bold",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  speakBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  triageBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  triageLabel: {
    ...FONTS.bold,
    fontSize: 16,
  },
  riskScoreText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  narrativeCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#86EFAC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  narrativeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  narrativeTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#166534",
  },
  narrativeText: {
    fontSize: 13,
    color: "#14532D",
    lineHeight: 20,
    fontWeight: "500",
  },
  candidateReason: {
    fontSize: 12,
    color: "#0369A1",
    backgroundColor: "#F0F9FF",
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 17,
  },
  redFlagsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  redFlagsTextWrap: {
    flex: 1,
  },
  redFlagsTitle: {
    fontWeight: "bold",
    color: COLORS.danger,
    fontSize: 13,
  },
  redFlagsContent: {
    color: "#991B1B",
    fontSize: 12,
    marginTop: 2,
  },
  planBlock: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avoidBlock: {
    backgroundColor: "#FFF1F2",
    borderColor: "#FECDD3",
  },
  emergencyBlock: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  planBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  planBlockTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    flex: 1,
  },
  planItemsContainer: {
    gap: 6,
  },
  planItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginTop: 6,
  },
  planItemText: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
  },
  avoidBullet: {
    fontSize: 12,
    marginTop: 1,
  },
  avoidItemText: {
    flex: 1,
    fontSize: 13,
    color: "#9F1239",
    lineHeight: 19,
  },
  emergencyBullet: {
    fontSize: 12,
    marginTop: 1,
  },
  emergencyItemText: {
    flex: 1,
    fontSize: 13,
    color: "#991B1B",
    fontWeight: "500",
    lineHeight: 19,
  },
  medicationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  medNameRow: {
    marginBottom: 4,
  },
  medNameText: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.aiDoctor,
  },
  medDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 3,
  },
  medDetailLabel: {
    fontWeight: "700",
    color: "#475569",
  },
  medDetailText: {
    flex: 1,
    fontSize: 12,
    color: "#334155",
    lineHeight: 18,
  },
  medPrecautionBox: {
    backgroundColor: "#FFFBEB",
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  medPrecautionText: {
    fontSize: 11,
    color: "#B45309",
    lineHeight: 16,
  },
  candidateSection: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    marginBottom: 8,
  },
  candidateHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  candidateHeading: {
    fontSize: 13,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  candidateSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  candidateCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  candidateTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  candidateName: {
    fontWeight: "bold",
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
  },
  likelihoodBadge: {
    backgroundColor: COLORS.aiDoctor + "18",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  likelihoodBadgeText: {
    fontSize: 11,
    color: COLORS.aiDoctor,
    fontWeight: "700",
  },
  candidateDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historySection: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  historyToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  historyHeading: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  historyContent: {
    marginTop: 8,
  },
  answerRow: {
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  answerQuestion: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  answerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default ClinicalDecisionSupportScreen;