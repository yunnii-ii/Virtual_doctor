import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Avatar, useTheme } from 'react-native-paper';
import { getHealthTips } from '../api';
import { Lightbulb, Heart, Apple, Dumbbell, Brain } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

const HealthTipsScreen = () => {
  const { t } = useTranslation();
  const [tips, setTips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTips = async () => {
    try {
      const data = await getHealthTips();
      setTips(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTips();
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchTips();
    setRefreshing(false);
  }, []);

  const getIcon = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('nutrition') || cat.includes('အာဟာရ')) return <Apple size={24} color="#FF9AA2" />;
    if (cat.includes('physical activity') || cat.includes('ကိုယ်လက်လှုပ်ရှားမှု')) return <Dumbbell size={24} color="#8FE0C3" />;
    if (cat.includes('mental health') || cat.includes('စိတ်ကျန်းမာရေး')) return <Brain size={24} color="#B9A3FF" />;
    if (cat.includes('general health') || cat.includes('အထွေထွေကျန်းမာရေး')) return <Heart size={24} color="#FF9DCC" />;
    return <Lightbulb size={24} color="#FFD98A" />;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>{t('health_tips')}</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>{t('health_tips_desc')}</Text>
      </View>

      <View style={styles.tipsList}>
        {tips.map((tip, index) => (
          <Card key={index} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  {getIcon(tip.category)}
                </View>
                <View style={styles.headerText}>
                  <Text variant="titleMedium" style={styles.tipTitle}>{tip.title}</Text>
                  <Text variant="labelSmall" style={styles.category}>{tip.category}</Text>
                </View>
              </View>
              <Text variant="bodyMedium" style={styles.content}>{tip.content}</Text>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 24,
  },
  title: {
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  tipsList: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    padding: 10,
    backgroundColor: '#F1F3F4',
    borderRadius: 20,
  },
  headerText: {
    marginLeft: 12,
  },
  tipTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  category: {
    color: '#6B7FFF',
    textTransform: 'uppercase',
  },
  content: {
    color: '#555',
    lineHeight: 20,
  },
});

export default HealthTipsScreen;
