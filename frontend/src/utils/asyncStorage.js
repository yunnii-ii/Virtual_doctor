let AsyncStorage;
let storageFallback = {};

try {
  const imported = require("@react-native-async-storage/async-storage");
  AsyncStorage = imported?.default ?? imported;
} catch (error) {
  console.warn(
    "AsyncStorage module not available, using in-memory fallback",
    error,
  );
}

const fallback = {
  async getItem(key) {
    return storageFallback[key] ?? null;
  },
  async setItem(key, value) {
    storageFallback[key] = value;
  },
  async removeItem(key) {
    delete storageFallback[key];
  },
};

export default AsyncStorage || fallback;
