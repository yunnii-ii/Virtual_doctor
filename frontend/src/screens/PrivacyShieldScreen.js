import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Heart,
  User,
  Pill,
  CalendarCheck,
  Eye,
  FileText,
  Trash2,
  Download,
  Cloud,
  Smartphone,
  Info,
  Clock,
  ChevronRight,
  ShieldOff,
} from 'lucide-react-native';
import AsyncStorage from '../utils/asyncStorage';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../utils/AuthContext';
import { FONTS, COLORS, SHADOWS } from '../utils/theme';

const STORAGE_KEY_LOCAL_ONLY = 'privacy_local_only';

const PrivacyShieldScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [localOnlyMode, setLocalOnlyMode] = useState(false);
  const [privacyScore, setPrivacyScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [animatedScore] = useState(new Animated.Value(0));

  // Data categories
  const getDataCategories = useCallback(() => [
    {
      id: 'health',
      icon: Heart,
      name: t('privacy_health_records'),
      description: t('privacy_health_desc'),
      color: COLORS.danger,
      encrypted: true,
    },
    {
      id: 'personal',
      icon: User,
      name: t('privacy_personal_info'),
      description: t('privacy_personal_desc'),
      color: COLORS.primary,
      encrypted: true,
    },
    {
      id: 'medicine',
      icon: Pill,
      name: t('privacy_medicine_history'),
      description: t('privacy_medicine_desc'),
      color: COLORS.secondary,
      encrypted: true,
    },
    {
      id: 'appointments',
      icon: CalendarCheck,
      name: t('privacy_appointment_records'),
      description: t('privacy_appointment_desc'),
      color: COLORS.purple,
      encrypted: localOnlyMode,
    },
  ], [t, localOnlyMode]);

  // Simulated audit log events
  const getAuditEvents = useCallback(() => [
    {
      id: '1',
      action: t('privacy_audit_health_report'),
      time: t('privacy_audit_2h_ago'),
      icon: FileText,
      color: COLORS.primary,
    },
    {
      id: '2',
      action: t('privacy_audit_bp_saved'),
      time: t('privacy_audit_5h_ago'),
      icon: Heart,
      color: COLORS.danger,
    },
    {
      id: '3',
      action: t('privacy_audit_profile_viewed'),
      time: t('privacy_audit_1d_ago'),
      icon: Eye,
      color: COLORS.teal,
    },
    {
      id: '4',
      action: t('privacy_audit_medicine_added'),
      time: t('privacy_audit_2d_ago'),
      icon: Pill,
      color: COLORS.secondary,
    },
    {
      id: '5',
      action: t('privacy_audit_mood_logged'),
      time: t('privacy_audit_3d_ago'),
      icon: Heart,
      color: COLORS.pink,
    },
  ], [t]);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const score = calculatePrivacyScore();
    setPrivacyScore(score);
    Animated.timing(animatedScore, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [localOnlyMode]);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_LOCAL_ONLY);
      if (stored !== null) {
        setLocalOnlyMode(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading privacy settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrivacyScore = () => {
    let score = 60; // Base score
    if (localOnlyMode) score += 30; // Local-only gives big boost
    if (user) score += 10; // Authenticated user
    return Math.min(score, 100);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return COLORS.secondary;
    if (score >= 50) return COLORS.accent;
    return COLORS.danger;
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return t('privacy_score_excellent');
    if (score >= 50) return t('privacy_score_good');
    return t('privacy_score_at_risk');
  };

  const getScoreIcon = (score) => {
    if (score >= 80) return ShieldCheck;
    if (score >= 50) return Shield;
    return ShieldAlert;
  };

  const toggleLocalOnly = async (value) => {
    try {
      setLocalOnlyMode(value);
      await AsyncStorage.setItem(STORAGE_KEY_LOCAL_ONLY, JSON.stringify(value));
    } catch (e) {
      console.error('Error saving local-only setting:', e);
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      t('privacy_delete_title'),
      t('privacy_delete_confirm_message'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('privacy_delete_confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(
                t('privacy_delete_success_title'),
                t('privacy_delete_success_message')
              );
            } catch (e) {
              console.error('Error deleting data:', e);
              Alert.alert(t('error'), t('privacy_delete_error'));
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stores = await AsyncStorage.multiGet(keys);
      const data = {};
      stores.forEach(([key, value]) => {
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      });
      const jsonString = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web') {
        Alert.alert(t('privacy_export_title'), jsonString);
      } else {
        try {
          await Share.share({
            message: jsonString,
            title: t('privacy_export_share_title'),
          });
        } catch {
          Alert.alert(t('privacy_export_title'), jsonString);
        }
      }
    } catch (e) {
      console.error('Error exporting data:', e);
      Alert.alert(t('error'), t('privacy_export_error'));
    }
  };

  const scoreColor = getScoreColor(privacyScore);
  const scoreLabel = getScoreLabel(privacyScore);
  const ScoreIcon = getScoreIcon(privacyScore);
  const dataCategories = getDataCategories();
  const auditEvents = getAuditEvents();

  // Gauge rendering
  const renderGauge = () => {
    const percentage = privacyScore / 100;
    const gaugeWidth = 220;
    const filledWidth = gaugeWidth * percentage;

    return (
      <View style={styles.gaugeContainer}>
        <View style={styles.gaugeIconRow}>
          <ScoreIcon size={48} color={scoreColor} strokeWidth={2} />
        </View>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>
          {privacyScore}
        </Text>
        <Text style={[styles.scoreLabel, { color: scoreColor }]}>
          {scoreLabel}
        </Text>
        <View style={styles.gaugeBarOuter}>
          <Animated.View
            style={[
              styles.gaugeBarInner,
              {
                width: filledWidth,
                backgroundColor: scoreColor,
              },
            ]}
          />
        </View>
        <View style={styles.gaugeLabelsRow}>
          <Text style={styles.gaugeMinLabel}>0</Text>
          <Text style={styles.gaugeMaxLabel}>100</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Shield size={48} color={COLORS.privacy} />
        <Text style={styles.loadingText}>{t('loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconContainer}>
          <ShieldCheck size={36} color={COLORS.surface} strokeWidth={2} />
        </View>
        <Text variant="headlineMedium" style={styles.headerTitle}>
          {t('privacy_title')}
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          {t('privacy_subtitle')}
        </Text>
      </View>

      {/* Privacy Score Gauge */}
      <Card style={styles.scoreCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('privacy_score_title')}
          </Text>
          {renderGauge()}
        </Card.Content>
      </Card>

      {/* Local-Only Mode Toggle */}
      <Card style={styles.toggleCard}>
        <Card.Content>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.toggleIconRow}>
                {localOnlyMode ? (
                  <Smartphone size={22} color={COLORS.secondary} />
                ) : (
                  <Cloud size={22} color={COLORS.primary} />
                )}
                <Text variant="titleMedium" style={styles.toggleTitle}>
                  {t('privacy_local_only_title')}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.toggleDescription}>
                {localOnlyMode
                  ? t('privacy_local_only_on_desc')
                  : t('privacy_local_only_off_desc')}
              </Text>
            </View>
            <Switch
              value={localOnlyMode}
              onValueChange={toggleLocalOnly}
              trackColor={{ false: COLORS.border, true: COLORS.secondary + '80' }}
              thumbColor={localOnlyMode ? COLORS.secondary : '#F4F3F4'}
            />
          </View>
          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: localOnlyMode
                  ? COLORS.secondary + '15'
                  : COLORS.primary + '15',
              },
            ]}
          >
            {localOnlyMode ? (
              <Lock size={14} color={COLORS.secondary} />
            ) : (
              <Cloud size={14} color={COLORS.primary} />
            )}
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color: localOnlyMode ? COLORS.secondary : COLORS.primary,
                },
              ]}
            >
              {localOnlyMode
                ? t('privacy_status_device_only')
                : t('privacy_status_cloud_sync')}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Data Categories */}
      <Text variant="titleMedium" style={styles.sectionHeader}>
        {t('privacy_data_categories_title')}
      </Text>
      {dataCategories.map((category) => {
        const CategoryIcon = category.icon;
        return (
          <Card key={category.id} style={styles.categoryCard}>
            <Card.Content style={styles.categoryContent}>
              <View style={styles.categoryLeft}>
                <View
                  style={[
                    styles.categoryIconContainer,
                    { backgroundColor: category.color + '15' },
                  ]}
                >
                  <CategoryIcon size={22} color={category.color} />
                </View>
                <View style={styles.categoryTextContainer}>
                  <Text variant="titleSmall" style={styles.categoryName}>
                    {category.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.categoryDesc}>
                    {category.description}
                  </Text>
                </View>
              </View>
              <View style={styles.categoryRight}>
                <View style={styles.storageIndicator}>
                  {localOnlyMode ? (
                    <Smartphone size={14} color={COLORS.secondary} />
                  ) : (
                    <Cloud size={14} color={COLORS.primary} />
                  )}
                  <Text
                    style={[
                      styles.storageText,
                      {
                        color: localOnlyMode
                          ? COLORS.secondary
                          : COLORS.primary,
                      },
                    ]}
                  >
                    {localOnlyMode
                      ? t('privacy_storage_local')
                      : t('privacy_storage_cloud')}
                  </Text>
                </View>
                {category.encrypted ? (
                  <Lock size={16} color={COLORS.secondary} />
                ) : (
                  <Unlock size={16} color={COLORS.accent} />
                )}
              </View>
            </Card.Content>
          </Card>
        );
      })}

      {/* Data Audit Log */}
      <Text variant="titleMedium" style={styles.sectionHeader}>
        {t('privacy_audit_log_title')}
      </Text>
      <Card style={styles.auditCard}>
        <Card.Content>
          {auditEvents.map((event, index) => {
            const EventIcon = event.icon;
            return (
              <View
                key={event.id}
                style={[
                  styles.auditRow,
                  index < auditEvents.length - 1 && styles.auditRowBorder,
                ]}
              >
                <View
                  style={[
                    styles.auditIconContainer,
                    { backgroundColor: event.color + '15' },
                  ]}
                >
                  <EventIcon size={16} color={event.color} />
                </View>
                <View style={styles.auditTextContainer}>
                  <Text variant="bodyMedium" style={styles.auditAction}>
                    {event.action}
                  </Text>
                  <View style={styles.auditTimeRow}>
                    <Clock size={12} color={COLORS.textMuted} />
                    <Text variant="bodySmall" style={styles.auditTime}>
                      {event.time}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={16} color={COLORS.textMuted} />
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {/* Federated Learning Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <View style={styles.infoHeader}>
            <View style={styles.infoIconContainer}>
              <Info size={20} color={COLORS.surface} />
            </View>
            <Text variant="titleMedium" style={styles.infoTitle}>
              {t('privacy_federated_title')}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.infoBody}>
            {t('privacy_federated_explanation')}
          </Text>
          <View style={styles.infoBullets}>
            <View style={styles.bulletRow}>
              <ShieldCheck size={16} color={COLORS.secondary} />
              <Text variant="bodySmall" style={styles.bulletText}>
                {t('privacy_federated_bullet1')}
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Lock size={16} color={COLORS.secondary} />
              <Text variant="bodySmall" style={styles.bulletText}>
                {t('privacy_federated_bullet2')}
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Smartphone size={16} color={COLORS.secondary} />
              <Text variant="bodySmall" style={styles.bulletText}>
                {t('privacy_federated_bullet3')}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <Button
          mode="contained"
          icon={({ size, color }) => <Download size={size} color={color} />}
          onPress={handleExportData}
          style={styles.exportButton}
          labelStyle={styles.exportButtonLabel}
          contentStyle={styles.buttonContent}
        >
          {t('privacy_export_button')}
        </Button>

        <Button
          mode="contained"
          icon={({ size, color }) => <Trash2 size={size} color={color} />}
          onPress={handleDeleteAllData}
          style={styles.deleteButton}
          labelStyle={styles.deleteButtonLabel}
          contentStyle={styles.buttonContent}
          buttonColor={COLORS.danger}
        >
          {t('privacy_delete_button')}
        </Button>
      </View>

      {/* Bottom Spacer */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    ...FONTS.regular,
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },

  // Header
  header: {
    backgroundColor: COLORS.privacy,
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    ...FONTS.bold,
    color: COLORS.surface,
    textAlign: 'center',
    marginBottom: 8,
  },
  headerSubtitle: {
    ...FONTS.regular,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },

  // Privacy Score
  scoreCard: {
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    ...SHADOWS.medium,
  },
  sectionTitle: {
    ...FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  gaugeIconRow: {
    marginBottom: 8,
  },
  scoreValue: {
    ...FONTS.bold,
    fontSize: 56,
    lineHeight: 64,
  },
  scoreLabel: {
    ...FONTS.bold,
    fontSize: 16,
    marginBottom: 16,
  },
  gaugeBarOuter: {
    width: 220,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    overflow: 'hidden',
  },
  gaugeBarInner: {
    height: '100%',
    borderRadius: 5,
  },
  gaugeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    marginTop: 4,
  },
  gaugeMinLabel: {
    ...FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  gaugeMaxLabel: {
    ...FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Toggle Card
  toggleCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  toggleTitle: {
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: 10,
  },
  toggleDescription: {
    ...FONTS.regular,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  statusBadgeText: {
    ...FONTS.bold,
    fontSize: 12,
    marginLeft: 6,
  },

  // Section Headers
  sectionHeader: {
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },

  // Data Categories
  categoryCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  categoryName: {
    ...FONTS.bold,
    color: COLORS.textPrimary,
  },
  categoryDesc: {
    ...FONTS.regular,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  storageText: {
    ...FONTS.bold,
    fontSize: 10,
    marginLeft: 4,
  },

  // Audit Log
  auditCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  auditRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  auditIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auditTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  auditAction: {
    ...FONTS.regular,
    color: COLORS.textPrimary,
  },
  auditTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  auditTime: {
    ...FONTS.regular,
    color: COLORS.textMuted,
    marginLeft: 4,
  },

  // Info Card (Federated Learning)
  infoCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: COLORS.indigo + '30',
    ...SHADOWS.small,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.indigo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    ...FONTS.bold,
    color: COLORS.indigo,
    marginLeft: 10,
  },
  infoBody: {
    ...FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  infoBullets: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletText: {
    ...FONTS.regular,
    color: COLORS.textPrimary,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },

  // Action Buttons
  actionButtonsContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  exportButton: {
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    ...SHADOWS.small,
  },
  exportButtonLabel: {
    ...FONTS.bold,
    color: COLORS.surface,
    fontSize: 15,
  },
  deleteButton: {
    borderRadius: 14,
    ...SHADOWS.small,
  },
  deleteButtonLabel: {
    ...FONTS.bold,
    color: COLORS.surface,
    fontSize: 15,
  },
  buttonContent: {
    paddingVertical: 8,
  },

  bottomSpacer: {
    height: 32,
  },
});

export default PrivacyShieldScreen;
