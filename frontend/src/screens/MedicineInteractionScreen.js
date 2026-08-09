import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Searchbar, List, Divider, useTheme } from 'react-native-paper';
import { ShieldAlert, CheckCircle2, AlertTriangle, Pill, Plus, Volume2, VolumeX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { speak, stop as stopTts } from '../utils/tts';

const MedicineInteractionScreen = () => {
  const { t, i18n } = useTranslation();
  const [med1, setMed1] = useState('');
  const [med2, setMed2] = useState('');
  const [result, setResult] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Hardcoded common interactions for demonstration
  const interactions = [
    { m1: 'aspirin', m2: 'warfarin', severity: 'high', note: 'Increases risk of severe bleeding.' },
    { m1: 'alcohol', m2: 'sedative', severity: 'high', note: 'Can cause extreme drowsiness and respiratory issues.' },
    { m1: 'alcohol', m2: 'paracetamol', severity: 'medium', note: 'May increase risk of liver damage.' },
    { m1: 'antacid', m2: 'iron', severity: 'low', note: 'Antacids can reduce the absorption of iron.' },
    { m1: 'statin', m2: 'grapefruit', severity: 'medium', note: 'Grapefruit can increase the level of statins in blood.' },
    { m1: 'amoxicillin', m2: 'methotrexate', severity: 'medium', note: 'May increase methotrexate toxicity.' },
  ];

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
    const conjunction = isMM ? "နှင့်" : "and";
    let speechText = `${med1} ${conjunction} ${med2}. `;
    if (result.severity === 'none') {
      speechText += t('no_known_interaction');
    } else {
      speechText += t('interaction_warning');
      speechText += ". ";
      speechText += result.note;
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

  const checkInteraction = () => {
    if (!med1 || !med2) return;
    
    const m1 = med1.toLowerCase().trim();
    const m2 = med2.toLowerCase().trim();

    const found = interactions.find(i => 
      (m1.includes(i.m1) && m2.includes(i.m2)) || 
      (m1.includes(i.m2) && m2.includes(i.m1))
    );

    if (found) {
      setResult(found);
    } else {
      setResult({ severity: 'none', note: t('no_interaction_found') });
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FB923C';
      case 'low': return '#FBBF24';
      case 'none': return '#10B981';
      default: return '#8A8FA3';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.mainCard}>
        <Card.Content>
          <View style={styles.header}>
            <ShieldAlert size={32} color="#F472B6" />
            <Text variant="titleLarge" style={styles.title}>{t('interaction_checker')}</Text>
          </View>
          <Text variant="bodySmall" style={styles.subtitle}>{t('interaction_desc_long')}</Text>

          <Searchbar
            placeholder={t('medicine_1')}
            onChangeText={setMed1}
            value={med1}
            style={styles.search}
            elevation={1}
          />
          <View style={styles.plusWrap}>
            <Plus size={20} color="#B0B5C0" />
          </View>
          <Searchbar
            placeholder={t('medicine_2')}
            onChangeText={setMed2}
            value={med2}
            style={styles.search}
            elevation={1}
          />

          <Button 
            mode="contained" 
            onPress={checkInteraction} 
            style={styles.btn}
            disabled={!med1 || !med2}
          >
            {t('check_now')}
          </Button>
        </Card.Content>
      </Card>

      {result && (
        <Card style={[styles.resultCard, { borderLeftColor: getSeverityColor(result.severity) }]}>
          <Card.Content>
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                {result.severity === 'none' ? (
                  <CheckCircle2 size={24} color="#10B981" />
                ) : (
                  <AlertTriangle size={24} color={getSeverityColor(result.severity)} />
                )}
                <Text variant="titleMedium" style={[styles.severityText, { color: getSeverityColor(result.severity) }]} numberOfLines={2}>
                  {result.severity === 'none' ? t('no_known_interaction') : t('interaction_warning')}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={speakResult} 
                style={[
                  styles.speakButton,
                  { backgroundColor: getSeverityColor(result.severity) }
                ]}
                activeOpacity={0.7}
              >
                {isSpeaking 
                  ? <VolumeX size={20} color="#FFFFFF" style={{ color: '#FFFFFF' }} /> 
                  : <Volume2 size={20} color="#FFFFFF" style={{ color: '#FFFFFF' }} />
                }
              </TouchableOpacity>
            </View>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium" style={styles.note}>{result.note}</Text>
            <Text variant="bodySmall" style={styles.disclaimer}>{t('interaction_disclaimer')}</Text>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.exampleCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.exampleTitle}>{t('try_examples')}</Text>
          <Text variant="bodySmall">Aspirin + Warfarin, Alcohol + Paracetamol</Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF2F7' },
  content: { padding: 16 },
  mainCard: { borderRadius: 20, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { marginLeft: 12, fontWeight: 'bold' },
  subtitle: { color: '#8A8FA3', marginBottom: 20 },
  search: { backgroundColor: '#F8F9FF', borderRadius: 12 },
  plusWrap: { alignItems: 'center', marginVertical: 8 },
  btn: { marginTop: 16, borderRadius: 12, backgroundColor: '#F472B6', height: 48, justifyContent: 'center' },
  resultCard: { borderRadius: 16, borderLeftWidth: 8, backgroundColor: '#FFF', elevation: 3 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, flexShrink: 1 },
  severityText: { marginLeft: 12, fontWeight: 'bold', flex: 1, flexShrink: 1 },
  speakButton: {
    flexShrink: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F472B6',
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  divider: { my: 12 },
  note: { color: '#5A5F73', lineHeight: 22 },
  disclaimer: { marginTop: 16, color: '#B0B5C0', fontStyle: 'italic' },
  exampleCard: { marginTop: 20, backgroundColor: '#FFF2F7' },
  exampleTitle: { fontWeight: 'bold', color: '#F472B6' },
});

export default MedicineInteractionScreen;
