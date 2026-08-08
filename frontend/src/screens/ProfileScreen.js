import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { Text, Avatar, List, Divider, Button, Surface, TextInput } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../utils/AuthContext';
import { updateUser } from '../api';
import { User, Settings, Shield, LogOut, ChevronRight, Camera, Globe } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const ProfileScreen = () => {
  const { user, logout, login } = useAuth();
  const { t, i18n } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [height, setHeight] = useState(user?.height || '');
  const [weight, setWeight] = useState(user?.weight || '');
  const [bp, setBp] = useState(user?.blood_pressure || '');
  const [emergencyContact, setEmergencyContact] = useState(user?.emergency_contact || '');
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'en' ? 'mm' : 'en';
    i18n.changeLanguage(nextLng);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Permission to access gallery is required.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
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
        ...extraData
      });
      await login(updatedData);
      setEditing(false);
      Alert.alert(t('success'), t('profile_updated'));
    } catch (error) {
      Alert.alert(t('error'), t('profile_update_failed'));
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = () => {
    if (!user.height || !user.weight) return null;
    const h = parseFloat(user.height) / 100;
    const w = parseFloat(user.weight);
    const bmi = (w / (h * h)).toFixed(1);
    
    let status = t('normal');
    let color = '#A8E6CF';
    let advice = t('bmi_advice_normal');

    if (bmi < 18.5) {
      status = t('underweight');
      color = '#7C8CFF';
      advice = t('bmi_advice_under');
    } else if (bmi >= 25 && bmi < 30) {
      status = t('overweight');
      color = '#FFDAC1';
      advice = t('bmi_advice_over');
    } else if (bmi >= 30) {
      status = t('obese');
      color = '#FF9AA2';
      advice = t('bmi_advice_obese');
    }

    return { bmi, status, color, advice };
  };

  const getBPStatus = () => {
    if (!user.blood_pressure) return null;
    const parts = user.blood_pressure.split('/');
    if (parts.length !== 2) return null;
    const sys = parseInt(parts[0]);
    const dia = parseInt(parts[1]);

    if (sys <= 120 && dia <= 80) return { status: t('bp_normal'), color: '#A8E6CF' };
    if (sys < 130 && dia <= 80) return { status: t('bp_elevated'), color: '#FFE9A8' };
    return { status: t('bp_high'), color: '#FF9AA2' };
  };

  const bmiData = calculateBMI();
  const bpData = getBPStatus();

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          <Avatar.Image 
            size={100} 
            source={{ uri: user.profile_pic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}` }} 
            style={styles.avatar}
          />
          <View style={styles.cameraIcon}>
            <Camera size={20} color="#FFF" />
          </View>
        </TouchableOpacity>
        
        {!editing ? (
          <>
            <Text variant="headlineSmall" style={styles.userName}>{user.name}</Text>
            <Text variant="bodyMedium" style={styles.userEmail}>{user.email}</Text>
            <Button mode="outlined" onPress={() => setEditing(true)} style={styles.editBtn}>
              {t('edit_profile')}
            </Button>
          </>
        ) : (
          <View style={styles.editForm}>
            <TextInput label={t('name')} value={name} onChangeText={setName} mode="outlined" style={styles.input} />
            <TextInput label={t('phone')} value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} />
            <TextInput label={t('address')} value={address} onChangeText={setAddress} mode="outlined" style={styles.input} />
            <View style={{ flexDirection: 'row' }}>
              <TextInput label={t('height')} value={height} onChangeText={setHeight} mode="outlined" style={[styles.input, { flex: 1, marginRight: 8 }]} keyboardType="numeric" />
              <TextInput label={t('weight')} value={weight} onChangeText={setWeight} mode="outlined" style={[styles.input, { flex: 1 }]} keyboardType="numeric" />
            </View>
            <TextInput label={t('blood_pressure')} value={bp} onChangeText={setBp} mode="outlined" style={styles.input} placeholder="120/80" />
            <TextInput label={t('emergency_contact')} value={emergencyContact} onChangeText={setEmergencyContact} mode="outlined" style={styles.input} keyboardType="phone-pad" />
            <View style={styles.editActions}>
              <Button mode="text" onPress={() => setEditing(false)} style={styles.actionBtn}>{t('cancel')}</Button>
              <Button mode="contained" onPress={() => handleUpdateProfile()} loading={loading} style={styles.actionBtn}>
                {t('save')}
              </Button>
            </View>
          </View>
        )}
      </Surface>

      {user.height && user.weight && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>{t('health_analysis')}</Text>
          <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <View>
                  <Text variant="labelSmall">{t('bmi')}</Text>
                  <Text variant="headlineMedium" style={{ color: bmiData.color }}>{bmiData.bmi}</Text>
                </View>
                <View>
                  <Text variant="labelSmall">{t('health_status')}</Text>
                  <Text variant="titleMedium" style={{ color: bmiData.color }}>{bmiData.status}</Text>
                </View>
              </View>
              <Text variant="bodySmall" style={{ marginBottom: 16 }}>{bmiData.advice}</Text>
              
              {bpData && (
                <>
                  <Divider />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                    <View>
                      <Text variant="labelSmall">{t('blood_pressure')}</Text>
                      <Text variant="titleLarge">{user.blood_pressure}</Text>
                    </View>
                    <View>
                      <Text variant="labelSmall">{t('bp_status')}</Text>
                      <Text variant="titleMedium" style={{ color: bpData.color }}>{bpData.status}</Text>
                    </View>
                  </View>
                </>
              )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>{t('settings')}</Text>
        <List.Item
          title={`${t('language')} / ဘာသာစကား`}
          description={i18n.language === 'en' ? 'English' : 'မြန်မာ'}
          left={() => <Globe size={24} color="#8A8FA3" style={styles.listIcon} />}
          right={() => <Button onPress={toggleLanguage}>{t('change')}</Button>}
          style={styles.listItem}
        />
      </View>

      <Button 
        mode="text" 
        textColor="#FF9AA2" 
        icon={() => <LogOut size={20} color="#FF9AA2" />}
        onPress={logout}
        style={styles.logoutBtn}
      >
        {t('logout')}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#E8ECFF',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#7C8CFF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  userName: {
    fontWeight: 'bold',
    color: '#5A5F73',
  },
  userEmail: {
    color: '#8A8FA3',
    marginBottom: 16,
  },
  editBtn: {
    borderRadius: 20,
    borderColor: '#7C8CFF',
  },
  editForm: {
    width: '100%',
    marginTop: 10,
  },
  input: {
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    marginLeft: 8,
  },
  section: {
    marginTop: 16,
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
  },
  sectionTitle: {
    padding: 16,
    color: '#7C8CFF',
    fontWeight: 'bold',
  },
  listItem: {
    paddingVertical: 8,
  },
  listIcon: {
    marginTop: 8,
  },
  logoutBtn: {
    margin: 24,
  },
});

export default ProfileScreen;
