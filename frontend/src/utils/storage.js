import AsyncStorage from "./asyncStorage";

const storage = AsyncStorage;

const KEYS = {
  USER: "vd_user",
  HISTORY: "vd_history",
};

export const saveUser = async (userData) => {
  try {
    await storage.setItem(KEYS.USER, JSON.stringify(userData));
  } catch (error) {
    console.error("Error saving user:", error);
  }
};

export const getUser = async () => {
  try {
    const user = await storage.getItem(KEYS.USER);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
};

export const clearUser = async () => {
  try {
    await storage.removeItem(KEYS.USER);
  } catch (error) {
    console.error("Error clearing user:", error);
  }
};

export const saveToHistory = async (item) => {
  try {
    const history = await getHistory();
    const newItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
    };
    const updatedHistory = [newItem, ...history];
    await storage.setItem(KEYS.HISTORY, JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error("Error saving to history:", error);
    return [];
  }
};

export const getHistory = async () => {
  try {
    const history = await storage.getItem(KEYS.HISTORY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error("Error getting history:", error);
    return [];
  }
};

export const clearHistory = async () => {
  try {
    await storage.removeItem(KEYS.HISTORY);
  } catch (error) {
    console.error("Error clearing history:", error);
  }
};
