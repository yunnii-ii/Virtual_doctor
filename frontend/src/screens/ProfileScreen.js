import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Text, Avatar, List, Divider, Button, Surface, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../utils/AuthContext';
import { updateUser } from '../api';
import {
  User,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  Camera,
  Globe,
  Activity,
  Heart,
  Scale,
  Phone,
  MapPin,
  AlertCircle,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const ProfileScreen = () => {
  const { user, logout, login } = useAuth();
  const { t, i18n } = useTranslation();
  const isMM = i18n.language === 'mm';

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [height, setHeight] = useState(user?.height || '');
  const [weight, setWeight] = useState(user?.weight || '');
  const [bp, setBp] = useState(user?.blood_pressure || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergency_contact || '');
  const [loading, setLoading] = useState(false);

  // Sync state when user object updates
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setHeight(user.height || '');
      setWeight(user.weight || '');
      setBp(user.blood_pressure || '');
      setEmergencyContact(user.emergency_contact || '');
    }
  }, [user]);

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'mm' : 'en';
    i18n.changeLanguage(nextLng);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permission_needed') || 'Permission needed', 'Permission to access gallery is required.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      handleUpdateProfile({ profile_pic: result.assets[0].uri });
    }
  };

  const handleUpdateProfile = async (extraData = {}) => {
    setLoading(true);
    try {
      const updatedData = await updateUser(user.id, {
        name,
        phone,
        address,
        height,
        weight,
        blood_pressure: bp,
        emergency_contact: emergencyContact,
        ...extraData,
      });
      await login(updatedData);
      setEditing(false);
      Alert.alert(t('success') || 'Success', t('profile_updated') || 'Profile updated successfully');
    } catch (error) {
      Alert.alert(t('error') || 'Error', t('profile_update_failed') || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // High-contrast, accessible BMI analysis
  const calculateBMI = () => {
    if (!user?.height || !user?.weight) return null;
    const h = parseFloat(user.height) / 100;
    const w = parseFloat(user.weight);
    if (!h || !w || h <= 0) return null;
    const bmi = (w / (h * h)).toFixed(1);

    let status = t('normal') || 'ပုံမှန်';
    let color = '#059669';
    let bg = '#ECFDF5';
    let advice = t('bmi_advice_normal') || 'ကောင်းမွန်ပါသည်။ လက်ရှိအတိုင်း ဆက်လက်ထိန်းသိမ်းပါ။';

    if (bmi < 18.5) {
      status = t('underweight') || 'ပိန်လွန်းသည်';
      color = '#2563EB';
      bg = '#EFF6FF';
      advice = t('bmi_advice_under') || 'အာဟာရပြည့်ဝသော အစားအစာများ ပိုမိုစားသုံးရန် လိုအပ်ပါသည်။';
    } else if (bmi >= 25 && bmi < 30) {
      status = t('overweight') || 'အဝလွန်စ';
      color = '#D97706';
      bg = '#FFFBEB';
      advice = t('bmi_advice_over') || 'ကိုယ်လက်လှုပ်ရှားမှု ပိုမိုပြုလုပ်ရန် လိုအပ်ပါသည်။';
    } else if (bmi >= 30) {
      status = t('obese') || 'အလွန်အဝလွန်သည်';
      color = '#DC2626';
      bg = '#FEF2F2';
      advice = t('bmi_advice_obese') || 'ဆရာဝန်နှင့် တိုင်ပင်၍ ကိုယ်အလေးချိန် လျှော့ချသင့်ပါသည်။';
    }

    return { bmi, status, color, bg, advice };
  };

  // High-contrast, accessible Blood Pressure analysis
  const getBPStatus = () => {
    if (!user?.blood_pressure) return null;
    const parts = user.blood_pressure.split('/');
    if (parts.length !== 2) return null;
    const sys = parseInt(parts[0], 10);
    const dia = parseInt(parts[1], 10);
    if (isNaN(sys) || isNaN(dia)) return null;

    if (sys <= 120 && dia <= 80) {
      return { status: t('bp_normal') || 'ပုံမှန်', color: '#059669', bg: '#ECFDF5' };
    }
    if (sys < 130 && dia <= 80) {
      return { status: t('bp_elevated') || 'သွေးတိုးစ', color: '#D97706', bg: '#FFFBEB' };
    }
    return { status: t('bp_high') || 'သွေးတိုးမြင့်သည်', color: '#DC2626', bg: '#FEF2F2' };
  };

  const bmiData = calculateBMI();
  const bpData = getBPStatus();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* ── User Header Card ── */}
      <Surface style={styles.header} elevation={1}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} activeOpacity={0.8}>
          <Avatar.Image
            size={96}
            source={{
              uri:
                user?.profile_pic ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`,
            }}
            style={styles.avatar}
          />
          <View style={styles.cameraIcon}>
            <Camera size={18} color="#FFF" />
          </View>
        </TouchableOpacity>

        {!editing ? (
          <View style={styles.userInfoBlock}>
            <Text variant="headlineSmall" style={styles.userName}>
              {user?.name || 'User'}
            </Text>
            <Text variant="bodyMedium" style={styles.userEmail}>
              {user?.email || ''}
            </Text>

            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={() => setEditing(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.editProfileBtnText}>{t('edit_profile')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.editForm}>
            <TextInput
              label={t('name')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={t('phone')}
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
            />
            <TextInput
              label={t('address')}
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              style={styles.input}
            />
            <View style={styles.rowInputs}>
              <TextInput
                label={t('height') + ' (cm)'}
                value={height}
                onChangeText={setHeight}
                mode="outlined"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                keyboardType="numeric"
              />
              <TextInput
                label={t('weight') + ' (kg)'}
                value={weight}
                onChangeText={setWeight}
                mode="outlined"
                style={[styles.input, { flex: 1 }]}
                keyboardType="numeric"
              />
            </View>
            <TextInput
              label={t('blood_pressure')}
              value={bp}
              onChangeText={setBp}
              mode="outlined"
              style={styles.input}
              placeholder="120/80"
            />
            <TextInput
              label={t('emergency_contact')}
              value={emergencyContact}
              onChangeText={setEmergencyContact}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
            />
            <View style={styles.editActions}>
              <Button
                mode="outlined"
                textColor="#64748B"
                onPress={() => setEditing(false)}
                style={styles.actionCancelBtn}
              >
                {t('cancel')}
              </Button>
              <Button
                mode="contained"
                buttonColor="#5568FF"
                textColor="#FFFFFF"
                onPress={() => handleUpdateProfile()}
                loading={loading}
                style={styles.actionSaveBtn}
              >
                {t('save')}
              </Button>
            </View>
          </View>
        )}
      </Surface>

      {/* ── Health Analysis Card (Structured, High-Contrast, No Overlapping) ── */}
      {user?.height && user?.weight && (
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Activity size={18} color="#5568FF" />
            <Text style={styles.sectionTitleText}>{t('health_analysis')}</Text>
          </View>

          <View style={styles.metricsContainer}>
            {/* 1. BMI Metric Box */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeaderRow}>
                <Scale size={16} color="#5568FF" />
                <Text style={styles.metricLabel} numberOfLines={1}>
                  {t('bmi')}
                </Text>
              </View>

              <View style={styles.metricValueRow}>
                <Text style={[styles.metricMainNumber, { color: bmiData.color }]}>
                  {bmiData.bmi}
                </Text>
                <View style={[styles.metricStatusBadge, { backgroundColor: bmiData.bg }]}>
                  <Text style={[styles.metricStatusText, { color: bmiData.color }]}>
                    {bmiData.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.metricAdvice}>{bmiData.advice}</Text>
            </View>

            {/* 2. Blood Pressure Metric Box */}
            {bpData && (
              <View style={[styles.metricCard, { marginTop: 12 }]}>
                <View style={styles.metricHeaderRow}>
                  <Heart size={16} color="#EF4444" />
                  <Text style={styles.metricLabel} numberOfLines={1}>
                    {t('blood_pressure')} (mmHg)
                  </Text>
                </View>

                <View style={styles.metricValueRow}>
                  <Text style={styles.metricMainNumber}>
                    {user.blood_pressure}
                  </Text>
                  <View style={[styles.metricStatusBadge, { backgroundColor: bpData.bg }]}>
                    <Text style={[styles.metricStatusText, { color: bpData.color }]}>
                      {bpData.status}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── Settings Section ── */}
      <View style={styles.cardSection}>
        <View style={styles.sectionHeader}>
          <Settings size={18} color="#5568FF" />
          <Text style={styles.sectionTitleText}>{t('settings')}</Text>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingsLeft}>
            <View style={styles.settingsIconBox}>
              <Globe size={20} color="#5568FF" />
            </View>
            <View style={styles.settingsTextContainer}>
              <Text style={styles.settingsTitle}>{t('language')}</Text>
              <Text style={styles.settingsSubtitle}>
                {i18n.language === 'en' ? 'English' : 'မြန်မာဘာသာ'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.langToggleBtn}
            onPress={toggleLanguage}
            activeOpacity={0.8}
          >
            <Text style={styles.langToggleText}>
              {i18n.language === 'en' ? 'မြန်မာ' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Logout Button ── */}
      <View style={styles.logoutWrapper}>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
          <LogOut size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: '#EEF2FF',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#5568FF',
    padding: 7,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfoBlock: {
    alignItems: 'center',
    width: '100%',
  },
  userName: {
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 16,
  },
  editProfileBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#5568FF',
    backgroundColor: '#F5F7FF',
  },
  editProfileBtnText: {
    color: '#5568FF',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Edit Form
  editForm: {
    width: '100%',
    marginTop: 8,
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  actionCancelBtn: {
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  actionSaveBtn: {
    borderRadius: 10,
  },

  // Cards & Sections
  cardSection: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },

  // Health Metrics
  metricsContainer: {
    width: '100%',
  },
  metricCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    flexShrink: 1,
  },
  metricValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricMainNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  metricStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  metricStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricAdvice: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },

  // Settings
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTextContainer: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  settingsSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  langToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  langToggleText: {
    color: '#4338CA',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Logout
  logoutWrapper: {
    margin: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    width: '100%',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ProfileScreen;
