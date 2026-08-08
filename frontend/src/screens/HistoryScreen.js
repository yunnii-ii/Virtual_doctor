import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { Text, List, Divider, Button } from "react-native-paper";
import { Activity, Pill, Heart, Droplet, Smile } from "lucide-react-native";
import { getHistoryFromDB, clearHistoryInDB } from "../api";
import { useAuth } from "../utils/AuthContext";
import { getHistory, clearHistory } from "../utils/storage";
import { useTranslation } from "react-i18next";

const HistoryScreen = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      if (user && user.id) {
        const data = await getHistoryFromDB(user.id);
        setHistory(data);
      } else {
        const data = await getHistory();
        setHistory(data);
      }
    } catch (error) {
      const data = await getHistory();
      setHistory(data);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [user]);

  const renderIcon = (type) => {
    switch (type) {
      case "Diagnosis":
        return <Activity size={24} color="#8FE0C3" style={styles.listIcon} />;
      case "Medicine":
        return <Pill size={24} color="#A3BAFF" style={styles.listIcon} />;
      case "Blood Pressure":
        return <Heart size={24} color="#FF7D90" style={styles.listIcon} />;
      case "Mood":
        return <Smile size={24} color="#FFB300" style={styles.listIcon} />;
      case "Water":
        return <Droplet size={24} color="#A3BAFF" style={styles.listIcon} />;
      default:
        return <Activity size={24} color="#8FE0C3" style={styles.listIcon} />;
    }
  };

  const handleClearHistory = async () => {
    if (user && user.id) {
      await clearHistoryInDB(user.id);
    }
    await clearHistory();
    setHistory([]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {t("history")}
        </Text>
        {history.length > 0 && (
          <Button compact onPress={handleClearHistory} textColor="#FF7D90">
            {t("clear")}
          </Button>
        )}
      </View>

      <View style={styles.listContainer}>
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {t("no_history")}
            </Text>
          </View>
        ) : (
          history.map((item, index) => (
            <React.Fragment key={item.id}>
              <List.Item
                title={item.title}
                description={`${item.details}\n${item.timestamp}`}
                left={() => renderIcon(item.type)}
                descriptionNumberOfLines={3}
                style={styles.listItem}
              />
              {index < history.length - 1 && <Divider />}
            </React.Fragment>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  header: {
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
    color: "#333",
  },
  listContainer: {
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    marginBottom: 24,
  },
  listItem: {
    paddingVertical: 12,
  },
  listIcon: {
    marginTop: 8,
    marginLeft: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
  },
});

export default HistoryScreen;
