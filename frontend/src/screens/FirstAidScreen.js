import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar, List, Divider, Searchbar, useTheme } from 'react-native-paper';
import { Heart, Flame, Wind, Droplet, Zap, AlertCircle, ChevronRight, Info } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const FirstAidScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const firstAidData = [
    {
      id: 'cpr',
      title: t('fa_cpr_title'),
      desc: t('fa_cpr_desc'),
      icon: Heart,
      color: '#FF6B6B',
      steps: t('fa_cpr_steps', { returnObjects: true })
    },
    {
      id: 'choking',
      title: t('fa_choking_title'),
      desc: t('fa_choking_desc'),
      icon: Wind,
      color: '#10B981',
      steps: t('fa_choking_steps', { returnObjects: true })
    },
    {
      id: 'burns',
      title: t('fa_burns_title'),
      desc: t('fa_burns_desc'),
      icon: Flame,
      color: '#FB923C',
      steps: t('fa_burns_steps', { returnObjects: true })
    },
    {
      id: 'bleeding',
      title: t('fa_bleeding_title'),
      desc: t('fa_bleeding_desc'),
      icon: Droplet,
      color: '#F472B6',
      steps: t('fa_bleeding_steps', { returnObjects: true })
    },
    {
      id: 'poisoning',
      title: t('fa_poisoning_title'),
      desc: t('fa_poisoning_desc'),
      icon: AlertCircle,
      color: '#A855F7',
      steps: t('fa_poisoning_steps', { returnObjects: true })
    },
    {
      id: 'fainting',
      title: t('fa_fainting_title'),
      desc: t('fa_fainting_desc'),
      icon: Zap,
      color: '#5568FF',
      steps: t('fa_fainting_steps', { returnObjects: true })
    }
  ];

  const filteredData = firstAidData.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [expandedId, setExpandedId] = useState(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder={t('search_first_aid')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.alertContainer}>
          <AlertCircle size={20} color="#FF6B6B" />
          <Text style={styles.alertText}>{t('fa_disclaimer')}</Text>
        </View>

        {filteredData.map((item) => (
          <Card 
            key={item.id} 
            style={[styles.card, expandedId === item.id && styles.expandedCard]}
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
          >
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBg, { backgroundColor: item.color + '20' }]}>
                  <item.icon size={28} color={item.color} />
                </View>
                <View style={styles.titleContainer}>
                  <Text variant="titleMedium" style={styles.cardTitle}>{item.title}</Text>
                  <Text variant="bodySmall" style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>
                </View>
                <ChevronRight 
                  size={20} 
                  color="#CCC" 
                  style={{ transform: [{ rotate: expandedId === item.id ? '90deg' : '0deg' }] }} 
                />
              </View>

              {expandedId === item.id && (
                <View style={styles.stepsContainer}>
                  <Divider style={styles.divider} />
                  {Array.isArray(item.steps) ? item.steps.map((step, index) => (
                    <View key={index} style={styles.stepRow}>
                      <Avatar.Text 
                        size={24} 
                        label={(index + 1).toString()} 
                        style={[styles.stepNumber, { backgroundColor: item.color }]} 
                        labelStyle={styles.stepNumberLabel}
                      />
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  )) : <Text>{t('no_steps_available')}</Text>}
                </View>
              )}
            </Card.Content>
          </Card>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 2,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#F3F4F8',
    borderRadius: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  alertContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  alertText: {
    marginLeft: 8,
    color: '#FF6B6B',
    fontSize: 12,
    flex: 1,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#FFF',
    elevation: 1,
  },
  expandedCard: {
    elevation: 4,
    borderColor: '#5568FF',
    borderWidth: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    padding: 10,
    borderRadius: 12,
  },
  titleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: '#5A5F73',
  },
  cardDesc: {
    color: '#8A8FA3',
    marginTop: 2,
  },
  stepsContainer: {
    marginTop: 12,
  },
  divider: {
    marginVertical: 12,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#6A6F85',
    lineHeight: 20,
  },
});

export default FirstAidScreen;
