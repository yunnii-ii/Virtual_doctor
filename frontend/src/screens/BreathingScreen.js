import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { Wind, Play, Square, Timer, Trophy, Info, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '../utils/asyncStorage';

// ── Rating Helper ──────────────────────────────────────
const getRating = (seconds, t) => {
  if (seconds < 15) return { label: t('breath_hold_rating_poor'), color: '#EF4444', bg: '#FEF2F2', stars: 1 };
  if (seconds < 30) return { label: t('breath_hold_rating_fair'), color: '#F59E0B', bg: '#FFFBEB', stars: 2 };
  if (seconds < 60) return { label: t('breath_hold_rating_good'), color: '#10B981', bg: '#ECFDF5', stars: 3 };
  return { label: t('breath_hold_rating_great'), color: '#6366F1', bg: '#EEF2FF', stars: 4 };
};

const Stars = ({ count }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4].map((i) => (
      <Text key={i} style={[styles.starText, { opacity: i <= count ? 1 : 0.25 }]}>
        ⭐
      </Text>
    ))}
  </View>
);

const BreathingScreen = () => {
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === 'mm';

  // ── Breathing Exercise State ──
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('ready');
  const animValue = useRef(new Animated.Value(1)).current;
  const isActiveRef = useRef(false);

  // ── Breath-Hold Test State ──
  const [holdMode, setHoldMode] = useState(false);        // Tab toggle
  const [holding, setHolding] = useState(false);           // Button active
  const [holdSeconds, setHoldSeconds] = useState(0);       // Current counter
  const [lastResult, setLastResult] = useState(null);      // Last completed score
  const [bestResult, setBestResult] = useState(null);      // Personal best
  const holdInterval = useRef(null);
  const holdStart = useRef(null);

  // Load Personal Best on mount
  useEffect(() => {
    AsyncStorage.getItem('breath_hold_best').then((v) => {
      if (v) setBestResult(parseInt(v, 10));
    });
  }, []);

  // ── Breathing Cycle Animation ──
  const stopBreathing = useCallback(() => {
    isActiveRef.current = false;
    setIsActive(false);
    setStatus('ready');
    animValue.stopAnimation();
    Animated.timing(animValue, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [animValue]);

  const runCycle = useCallback(() => {
    if (!isActiveRef.current) return;
    setStatus('inhale');
    Animated.timing(animValue, {
      toValue: 1.6,
      duration: 4000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isActiveRef.current) return;
      setStatus('hold');
      setTimeout(() => {
        if (!isActiveRef.current) return;
        setStatus('exhale');
        Animated.timing(animValue, {
          toValue: 1,
          duration: 4000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(({ finished: f }) => {
          if (f && isActiveRef.current) setTimeout(runCycle, 800);
        });
      }, 2500);
    });
  }, [animValue]);

  const startBreathing = useCallback(() => {
    isActiveRef.current = true;
    setIsActive(true);
    runCycle();
  }, [runCycle]);

  const getStatusText = () => {
    switch (status) {
      case 'inhale': return t('breathe_in');
      case 'hold':   return t('hold_breath');
      case 'exhale': return t('breathe_out');
      default:       return t('ready_to_start');
    }
  };

  // ── Hold Test Handlers ──
  const onHoldStart = () => {
    setHolding(true);
    setHoldSeconds(0);
    setLastResult(null);
    holdStart.current = Date.now();
    holdInterval.current = setInterval(() => {
      setHoldSeconds(Math.floor((Date.now() - holdStart.current) / 1000));
    }, 100);
  };

  const onHoldEnd = async () => {
    if (!holding) return;
    clearInterval(holdInterval.current);
    const elapsed = Math.floor((Date.now() - holdStart.current) / 1000);
    setHolding(false);
    setHoldSeconds(elapsed);
    setLastResult(elapsed);

    // Save personal best
    if (bestResult === null || elapsed > bestResult) {
      setBestResult(elapsed);
      await AsyncStorage.setItem('breath_hold_best', String(elapsed));
    }
  };

  const circleColor = status === 'exhale' ? '#F43F5E' : status === 'inhale' ? '#0D9488' : '#3B82F6';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Modern Segmented Tab Switcher (No text clip or overflow) ── */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, !holdMode && styles.tabButtonActiveTeal]}
          onPress={() => { setHoldMode(false); stopBreathing(); }}
          activeOpacity={0.8}
        >
          <Wind size={15} color={!holdMode ? '#FFF' : '#64748B'} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.tabButtonText, !holdMode && styles.tabButtonTextActive]}
          >
            {t('breathing_exercise')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, holdMode && styles.tabButtonActiveOrange]}
          onPress={() => { setHoldMode(true); stopBreathing(); }}
          activeOpacity={0.8}
        >
          <Timer size={15} color={holdMode ? '#FFF' : '#64748B'} />
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.tabButtonText, holdMode && styles.tabButtonTextActive]}
          >
            {t('breath_hold_test')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════
          MODE 1: GUIDED BREATHING EXERCISE
      ══════════════════════════════════════════════ */}
      {!holdMode && (
        <View style={styles.centerMode}>
          {/* Animated Breath Sphere */}
          <View style={styles.sphereWrapper}>
            <Animated.View
              style={[
                styles.sphereOuter,
                { transform: [{ scale: animValue }], backgroundColor: circleColor + '20', borderColor: circleColor },
              ]}
            >
              <View style={[styles.sphereInner, { backgroundColor: circleColor }]}>
                <Wind size={36} color="#FFF" />
              </View>
            </Animated.View>
          </View>

          {/* Phase Status */}
          <Text variant="headlineMedium" style={[styles.phaseTitle, { color: circleColor }]}>
            {getStatusText()}
          </Text>
          <Text variant="bodyMedium" style={styles.phaseDesc}>
            {t('breathing_desc_long')}
          </Text>

          {/* Start / Stop Button */}
          <View style={styles.actionRow}>
            {!isActive ? (
              <TouchableOpacity style={styles.mainStartBtn} onPress={startBreathing} activeOpacity={0.85}>
                <Play size={20} color="#FFF" />
                <Text style={styles.mainBtnText}>{t('start') || 'Start'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.mainStopBtn} onPress={stopBreathing} activeOpacity={0.85}>
                <Square size={20} color="#FFF" />
                <Text style={styles.mainBtnText}>{t('stop') || 'Stop'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* ══════════════════════════════════════════════
          MODE 2: BREATH-HOLD CAPACITY TEST
      ══════════════════════════════════════════════ */}
      {holdMode && (
        <View style={styles.holdModeContainer}>
          {/* Instruction Pill */}
          <View style={styles.instructionBox}>
            <Info size={16} color="#0284C7" style={{ marginTop: 2 }} />
            <Text style={styles.instructionText}>
              {t('breath_hold_desc')}
            </Text>
          </View>

          {/* Personal Best Record Banner */}
          {bestResult !== null && (
            <View style={styles.bestRecordBadge}>
              <Trophy size={16} color="#D97706" />
              <Text style={styles.bestRecordText}>
                {t('breath_hold_best')} : <Text style={styles.bestRecordNum}>{bestResult} {t('breath_hold_seconds')}</Text>
              </Text>
            </View>
          )}

          {/* Glowing Timer Circle */}
          <View style={[styles.timerCircleOuter, holding && styles.timerCircleOuterActive]}>
            <View style={[styles.timerCircleInner, holding && styles.timerCircleInnerActive]}>
              <Text style={[styles.timerNumber, holding && styles.timerNumberActive]}>
                {holdSeconds}
              </Text>
              <Text style={styles.timerUnitLabel}>
                {t('breath_hold_seconds')}
              </Text>
            </View>
          </View>

          {/* Interactive Press & Hold Button */}
          <Pressable
            onPressIn={onHoldStart}
            onPressOut={onHoldEnd}
            style={({ pressed }) => [
              styles.pressHoldButton,
              holding && styles.pressHoldButtonHolding,
              pressed && styles.pressHoldButtonPressed,
            ]}
          >
            <Timer size={20} color="#FFF" />
            <Text style={styles.pressHoldButtonText}>
              {holding ? t('breath_hold_holding') : t('breath_hold_press')}
            </Text>
          </Pressable>

          {/* Completed Result Card & Threshold Guide */}
          {lastResult !== null && (() => {
            const rating = getRating(lastResult, t);
            return (
              <Card style={[styles.resultCard, { borderColor: rating.color }]}>
                <Card.Content style={styles.resultCardContent}>
                  <Text style={styles.resultHeading}>{t('breath_hold_result')}</Text>
                  
                  <View style={styles.resultScoreRow}>
                    <Text style={[styles.resultScoreNumber, { color: rating.color }]}>
                      {lastResult}
                    </Text>
                    <Text style={styles.resultScoreUnit}> {t('breath_hold_seconds')}</Text>
                  </View>

                  <Stars count={rating.stars} />

                  <View style={[styles.ratingBadge, { backgroundColor: rating.bg }]}>
                    <Text style={[styles.ratingBadgeText, { color: rating.color }]}>
                      {rating.label}
                    </Text>
                  </View>

                  {/* Rating Threshold Breakdown Table */}
                  <View style={styles.thresholdTable}>
                    {[
                      { range: '< 15s', label: t('breath_hold_rating_poor'), color: '#EF4444' },
                      { range: '15–30s', label: t('breath_hold_rating_fair'), color: '#F59E0B' },
                      { range: '30–60s', label: t('breath_hold_rating_good'), color: '#10B981' },
                      { range: '60s+',  label: t('breath_hold_rating_great'), color: '#6366F1' },
                    ].map((g, i) => (
                      <View key={i} style={styles.thresholdRow}>
                        <View style={[styles.thresholdDot, { backgroundColor: g.color }]} />
                        <Text style={styles.thresholdRange}>{g.range}</Text>
                        <Text style={[styles.thresholdLabel, { color: g.color }]}>{g.label}</Text>
                      </View>
                    ))}
                  </View>
                </Card.Content>
              </Card>
            );
          })()}
        </View>
      )}
    </ScrollView>
  );
};

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
    paddingBottom: 60,
  },

  // ── Tab Switcher ──
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 20,
  },
  tabButtonActiveTeal: {
    backgroundColor: '#0D9488',
    ...Platform.select({
      ios: { shadowColor: '#0D9488', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  tabButtonActiveOrange: {
    backgroundColor: '#EA580C',
    ...Platform.select({
      ios: { shadowColor: '#EA580C', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 3 },
    }),
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    flexShrink: 1,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // ── Guided Breathing Mode ──
  centerMode: {
    alignItems: 'center',
    paddingTop: 24,
  },
  sphereWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  sphereOuter: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sphereInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  phaseTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    fontSize: 24,
  },
  phaseDesc: {
    textAlign: 'center',
    color: '#64748B',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 20,
    fontSize: 14,
  },
  actionRow: {
    width: '100%',
    alignItems: 'center',
  },
  mainStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
  },
  mainStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F43F5E',
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 4,
  },
  mainBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // ── Breath-Hold Test Mode ──
  holdModeContainer: {
    alignItems: 'center',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    width: '100%',
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 19,
    fontWeight: '500',
  },
  bestRecordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
  },
  bestRecordText: {
    color: '#92400E',
    fontWeight: '600',
    fontSize: 12,
  },
  bestRecordNum: {
    fontWeight: 'bold',
    color: '#B45309',
  },

  // Timer Circle
  timerCircleOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#F1F5F9',
    borderWidth: 4,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerCircleOuterActive: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
    elevation: 6,
    shadowColor: '#EA580C',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  timerCircleInner: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  timerCircleInnerActive: {
    backgroundColor: '#FFFFFF',
  },
  timerNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#334155',
    lineHeight: 52,
  },
  timerNumberActive: {
    color: '#EA580C',
  },
  timerUnitLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // Press & Hold Button
  pressHoldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EA580C',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 32,
    width: '100%',
    maxWidth: 300,
    elevation: 4,
    shadowColor: '#EA580C',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 20,
  },
  pressHoldButtonHolding: {
    backgroundColor: '#DC2626',
    transform: [{ scale: 1.03 }],
  },
  pressHoldButtonPressed: {
    opacity: 0.9,
  },
  pressHoldButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Result Card
  resultCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    marginBottom: 20,
  },
  resultCardContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  resultHeading: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  resultScoreNumber: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  resultScoreUnit: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
    marginBottom: 8,
  },
  starText: {
    fontSize: 16,
  },
  ratingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  ratingBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Threshold Table
  thresholdTable: {
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 8,
  },
  thresholdDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  thresholdRange: {
    width: 60,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  thresholdLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});

export default BreathingScreen;
