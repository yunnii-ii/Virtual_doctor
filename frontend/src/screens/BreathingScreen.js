import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { Wind, Play, Square } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const BreathingScreen = () => {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('ready'); // ready, inhale, hold, exhale
  const animValue = useRef(new Animated.Value(1)).current;

  const startBreathing = () => {
    setIsActive(true);
    runCycle();
  };

  const stopBreathing = () => {
    setIsActive(false);
    setStatus('ready');
    animValue.stopAnimation();
    animValue.setValue(1);
  };

  const runCycle = () => {
    // Inhale
    setStatus('inhale');
    Animated.timing(animValue, {
      toValue: 2,
      duration: 4000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      
      // Hold
      setStatus('hold');
      setTimeout(() => {
        if (!isActive) return;
        
        // Exhale
        setStatus('exhale');
        Animated.timing(animValue, {
          toValue: 1,
          duration: 4000,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            setTimeout(runCycle, 1000);
          }
        });
      }, 2000);
    });
  };

  const getStatusText = () => {
    switch (status) {
      case 'inhale': return t('breathe_in');
      case 'hold': return t('hold_breath');
      case 'exhale': return t('breathe_out');
      default: return t('ready_to_start');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View 
          style={[
            styles.circle, 
            { transform: [{ scale: animValue }] },
            status === 'inhale' && styles.inhaleColor,
            status === 'exhale' && styles.exhaleColor,
            status === 'hold' && styles.holdColor,
          ]}
        >
          <Wind size={40} color="#FFF" />
        </Animated.View>
        
        <Text variant="displaySmall" style={styles.statusText}>{getStatusText()}</Text>
        <Text variant="bodyLarge" style={styles.desc}>{t('breathing_desc_long')}</Text>

        <View style={styles.controls}>
          {!isActive ? (
            <Button 
              mode="contained" 
              icon={() => <Play size={20} color="#FFF" />} 
              onPress={startBreathing}
              style={styles.btn}
            >
              {t('start')}
            </Button>
          ) : (
            <Button 
              mode="outlined" 
              icon={() => <Square size={20} color="#FF6B6B" />} 
              onPress={stopBreathing}
              style={[styles.btn, { borderColor: '#FF6B6B' }]}
              labelStyle={{ color: '#FF6B6B' }}
            >
              {t('stop')}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F4F8', justifyContent: 'center' },
  center: { alignItems: 'center', padding: 20 },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
    elevation: 10,
    shadowColor: '#4ECDC4',
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  inhaleColor: { backgroundColor: '#4ECDC4' },
  holdColor: { backgroundColor: '#4ECDC4' },
  exhaleColor: { backgroundColor: '#4ECDC4' },
  statusText: { fontWeight: 'bold', color: '#5A8A96', marginBottom: 20 },
  desc: { textAlign: 'center', color: '#6A9AAA', opacity: 0.8, marginBottom: 40 },
  controls: { width: '100%', alignItems: 'center' },
  btn: { width: 200, height: 50, justifyContent: 'center', borderRadius: 25 },
});

export default BreathingScreen;
