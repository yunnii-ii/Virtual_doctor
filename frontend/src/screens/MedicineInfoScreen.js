import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ScrollView, Alert, Image, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Text, Searchbar, Button, Card, Divider, List, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { getMedicineInfo, identifyMedicine, saveHistoryToDB, getAllMedicines } from '../api';
import { useAuth } from '../utils/AuthContext';
import { saveToHistory } from '../utils/storage';
import { Pill, Camera, Search, Info, AlertTriangle, HelpCircle, ChevronRight, Image as ImageIcon, Volume2, VolumeX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import VoiceInput from '../components/VoiceInput';
import { speak, stop as stopTts } from '../utils/tts';

const MedicineInfoScreen = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [medicine, setMedicine] = useState(null);
  const [image, setImage] = useState(null);
  const [allMedicines, setAllMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleVoiceTranscription = async (text) => {
    // Set the search query to the transcribed text
    setSearchQuery(text);
    // Automatically run the search for the medicine
    await handleSearch(text);
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    try {
      const data = await getAllMedicines();
      setAllMedicines(data);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    }
  };

  const handleSearch = async (query) => {
    const term = typeof query === 'string' ? query : searchQuery;
    if (!term) {
      setMedicine(null);
      setFilteredMedicines([]);
      return;
    }
    
    setLoading(true);
    try {
      const data = await getMedicineInfo(term);
      setMedicine(data);
      setImage(null);
      setFilteredMedicines([]);
      // Save to Local Storage
      await saveToHistory({
        type: 'Medicine',
        title: data.name,
        details: data.description,
      });
      // Save to Backend Database
      if (user && user.id) {
        await saveHistoryToDB('Medicine', data.name, data.description, user.id);
      }
    } catch (error) {
      // If direct search fails, filter the local list
      const filtered = allMedicines.filter(m => 
        m.name.toLowerCase().includes(term.toLowerCase())
      );
      if (filtered.length > 0) {
        setFilteredMedicines(filtered);
        setMedicine(null);
      } else {
        Alert.alert(t('not_found'), t('medicine_not_found'));
        setMedicine(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectMedicine = (med) => {
    setMedicine(med);
    setSearchQuery(med.name);
    setFilteredMedicines([]);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permission_needed'), t('camera_permission'));
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      handleIdentify(uri);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permission_needed'), t('gallery_permission'));
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      handleIdentify(uri);
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
    if (!medicine) return;
    
    if (isSpeaking) {
      await stopSpeech();
      return;
    }
    
    const isMM = i18n.language === "mm";
    let speechText = `${medicine.name}. ${medicine.description}. `;
    speechText += isMM ? "အသုံးပြုပုံ: " : "Uses: ";
    speechText += medicine.uses.join(". ");
    speechText += isMM ? ". သောက်ပမာဏ: " : ". Dosage: ";
    speechText += medicine.dosage;
    speechText += isMM ? ". ဘေးထွက်ဆိုးကျိုးများ: " : ". Side effects: ";
    speechText += medicine.side_effects.join(", ");
    speechText += isMM ? ". သတိထားရန်: " : ". Precautions: ";
    speechText += medicine.precautions;
    
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

  const handleIdentify = async (uri) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const data = await identifyMedicine(formData);
      // After identifying the name, get the full info
      const info = await getMedicineInfo(data.medicine_name);
      setMedicine(info);
    } catch (error) {
      Alert.alert(t('error'), t('identify_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>{t('find_medicine')}</Text>
        <Searchbar
          placeholder={t('search_placeholder')}
          onChangeText={(text) => {
            setSearchQuery(text);
            if (!text) {
              setMedicine(null);
              setFilteredMedicines([]);
            }
          }}
          value={searchQuery}
          onIconPress={handleSearch}
          onSubmitEditing={handleSearch}
          style={styles.searchbar}
        />
        <VoiceInput
          onTranscriptionComplete={handleVoiceTranscription}
          placeholderText="Press mic to say medicine name"
        />
        <View style={styles.orContainer}>
          <Divider style={styles.orDivider} />
          <Text style={styles.orText}>OR</Text>
          <Divider style={styles.orDivider} />
        </View>
        <View style={styles.buttonRow}>
          <Button
            mode="contained"
            icon={() => <Camera size={20} color="#FFF" />}
            onPress={pickImage}
            style={[styles.cameraButton, { flex: 1, marginRight: 4 }]}
            labelStyle={styles.cameraButtonLabel}
          >
            {t('camera')}
          </Button>
          <Button
            mode="contained"
            icon={() => <ImageIcon size={20} color="#FFF" />}
            onPress={pickFromGallery}
            style={[styles.cameraButton, { flex: 1, marginLeft: 4, backgroundColor: '#10B981' }]}
            labelStyle={styles.cameraButtonLabel}
          >
            {t('gallery')}
          </Button>
        </View>
      </View>

      {loading && <ActivityIndicator animating={true} color="#5568FF" style={{ margin: 20 }} />}

      {image && <Image source={{ uri: image }} style={styles.previewImage} />}

      {filteredMedicines.length > 0 && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>{t('suggested_medicines')}</Text>
          {filteredMedicines.map((med, index) => (
            <TouchableOpacity key={index} onPress={() => selectMedicine(med)}>
              <Card style={styles.listItemCard}>
                <Card.Content style={styles.listItemContent}>
                  <View style={styles.listItemLeft}>
                    <Pill size={20} color="#5568FF" />
                    <Text style={styles.listItemName}>{med.name}</Text>
                  </View>
                  <ChevronRight size={20} color="#CCC" />
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {medicine && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <View style={styles.resultHeader}>
              <Pill size={32} color="#5568FF" />
              <View style={styles.titleContainer}>
                <Text variant="headlineSmall" style={styles.medName} numberOfLines={2}>{medicine.name}</Text>
                <Text variant="bodyMedium" style={styles.medDesc} numberOfLines={3}>{medicine.description}</Text>
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

            <Divider style={styles.divider} />

            <List.Section>
              <List.Item
                title={t('uses')}
                description={medicine.uses.join('\n')}
                left={() => <HelpCircle size={24} color="#10B981" />}
                descriptionNumberOfLines={10}
              />
              <List.Item
                title={t('dosage')}
                description={medicine.dosage}
                left={() => <Info size={24} color="#5568FF" />}
                descriptionNumberOfLines={10}
              />
              <List.Item
                title={t('side_effects')}
                description={medicine.side_effects.join(', ')}
                left={() => <AlertTriangle size={24} color="#FB923C" />}
                descriptionNumberOfLines={10}
              />
              <List.Item
                title={t('precautions')}
                description={medicine.precautions}
                left={() => <Info size={24} color="#FF6B6B" />}
                descriptionNumberOfLines={10}
              />
            </List.Section>
          </Card.Content>
        </Card>
      )}

      {!medicine && filteredMedicines.length === 0 && !loading && (
        <View style={styles.browseContainer}>
          <Text style={styles.browseTitle}>{t('popular_medicines')}</Text>
          <View style={styles.chipContainer}>
            {allMedicines.slice(0, 10).map((med, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.chip} 
                onPress={() => selectMedicine(med)}
              >
                <Text style={styles.chipText}>{med.name.split(' (')[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontWeight: 'bold',
    color: '#5A5F73',
    marginBottom: 16,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#F3F4F8',
    borderRadius: 12,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  orDivider: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 10,
    color: '#B0B5C0',
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cameraButton: {
    borderRadius: 12,
    marginTop: 8,
    backgroundColor: '#5568FF',
    elevation: 2,
  },
  cameraButtonLabel: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    paddingVertical: 2,
  },
  previewImage: {
    width: '90%',
    height: 200,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 20,
  },
  resultCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    elevation: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  speakButton: {
    flexShrink: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5568FF',
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#5568FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  titleContainer: {
    marginLeft: 16,
    flex: 1,
  },
  medName: {
    fontWeight: 'bold',
    color: '#5A5F73',
  },
  medDesc: {
    color: '#8A8FA3',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F2F6',
  },
  listContainer: {
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5A5F73',
    marginBottom: 12,
  },
  listItemCard: {
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#FFF',
    elevation: 1,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemName: {
    marginLeft: 12,
    fontSize: 15,
    color: '#5A5F73',
  },
  browseContainer: {
    padding: 16,
    marginTop: 8,
  },
  browseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5A5F73',
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D8DEFF',
  },
  chipText: {
    color: '#5568FF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MedicineInfoScreen;
