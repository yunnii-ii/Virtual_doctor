import axios from "axios";
import Logger from "../utils/logger";
import i18n from "../utils/i18n";

import AsyncStorage from "../utils/asyncStorage";

// Replace '192.168.x.x' with your computer's local IP address (e.g., 192.168.100.18:8001)
let API_BASE_URL = "http://192.168.100.18:8001";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Auto-load saved URL from AsyncStorage
AsyncStorage.getItem("api_base_url").then((saved) => {
  if (saved) {
    api.defaults.baseURL = saved;
  }
}).catch(() => {});

export const setBaseURL = (url) => {
  if (url) api.defaults.baseURL = url;
};

export const getBaseURL = () => api.defaults.baseURL || API_BASE_URL;

api.interceptors.request.use((config) => {
  // Add language header
  config.headers["Accept-Language"] = i18n.language || "en";
  Logger.api(config.method, config.url, config.data);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    Logger.error(
      `API Error: ${error.config.url}`,
      error.response?.data || error.message,
    );
    return Promise.reject(error);
  },
);

export const diagnose = async (symptoms) => {
  const response = await api.post("/diagnose", { symptoms });
  return response.data;
};

export const register = async (name, email, password) => {
  const response = await api.post("/register", { name, email, password });
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post("/login", { email, password });
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

export const saveHistoryToDB = async (type, title, details, userId) => {
  const response = await api.post("/history", {
    type,
    title,
    details,
    user_id: userId,
  });
  return response.data;
};

export const getHistoryFromDB = async (userId) => {
  const response = await api.get(`/history/${userId}`);
  return response.data;
};

export const clearHistoryInDB = async (userId) => {
  const response = await api.delete(`/history/${userId}`);
  return response.data;
};

export const getAllMedicines = async () => {
  const response = await api.get("/medicines");
  return response.data;
};

export const getMedicineInfo = async (name) => {
  const response = await api.get(`/medicine/${name}`);
  return response.data;
};

export const getHealthTips = async () => {
  const response = await api.get("/tips");
  return response.data;
};

export const identifyMedicine = async (formData) => {
  const response = await api.post("/identify-medicine", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const clinicalDecisionSupport = async (payload) => {
  const response = await api.post("/clinical-decision-support", payload);
  return response.data;
};

export const predictiveAnalytics = async (payload) => {
  const response = await api.post("/predictive-analytics", payload);
  return response.data;
};

export const createTelemedicineSession = async (payload) => {
  const response = await api.post("/telemedicine/session", payload);
  return response.data;
};

export const sendFederatedUpdate = async (payload) => {
  const response = await api.post("/federated-learning/update", payload);
  return response.data;
};

export const transcribeVoice = async (formData) => {
  const response = await api.post("/voice/transcribe", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const runVoiceCommand = async (transcript) => {
  const response = await api.post("/voice/command", { transcript });
  return response.data;
};

export const interpretVoiceSymptoms = async (transcript) => {
  const response = await api.post("/voice/interpret-symptoms", { transcript });
  return response.data;
};

export const personalizedIntervention = async (payload) => {
  const response = await api.post("/personalized-intervention", payload);
  return response.data;
};

export default api;
