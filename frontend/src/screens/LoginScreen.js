import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput as RNTextInput,
  Platform,
} from "react-native";
import {
  Text,
  Button,
  Surface,
  Portal,
  Modal,
} from "react-native-paper";
import { X, Globe, Check, Server } from "lucide-react-native";
import { login as loginApi, setBaseURL } from "../api";
import { useAuth } from "../utils/AuthContext";
import AsyncStorage from "../utils/asyncStorage";

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [tapCount, setTapCount] = useState(0);
  const [urlVisible, setUrlVisible] = useState(false);
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    loadSavedUrl();
  }, []);

  const loadSavedUrl = async () => {
    const saved = await AsyncStorage.getItem("api_base_url");
    if (saved) {
      setBaseURL(saved);
      setNewUrl(saved);
    } else {
      setNewUrl("http://192.168.100.18:8001");
    }
  };

  const handleLogoTap = () => {
    const newCount = tapCount + 1;
    if (newCount >= 5) {
      setTapCount(0);
      setUrlVisible(true);
    } else {
      setTapCount(newCount);
    }
  };

  const saveUrl = async () => {
    if (newUrl && newUrl.trim()) {
      const trimmed = newUrl.trim();
      await AsyncStorage.setItem("api_base_url", trimmed);
      setBaseURL(trimmed);
      setUrlVisible(false);
      Alert.alert("Success", "API URL updated successfully to:\n" + trimmed);
    } else {
      Alert.alert("Error", "Please enter a valid URL");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const userData = await loginApi(email.trim(), password);
      await login(userData);
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error.response?.data?.detail || "Something went wrong. Please check your network or API URL.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Surface style={styles.logoContainer} elevation={4}>
          <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.8}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </Surface>
        <Text variant="headlineMedium" style={styles.title}>
          Virtual Doctor
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Your AI Health Assistant
        </Text>
      </View>

      <View style={styles.form}>
        {/* Native IME safe Email Input */}
        <Text style={styles.inputLabel}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <RNTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor="#94A3B8"
            style={styles.nativeInput}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textContentType="emailAddress"
          />
          {email.length > 0 && (
            <TouchableOpacity onPress={() => setEmail("")} style={styles.clearBtn}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Native IME safe Password Input */}
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputWrapper}>
          <RNTextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#94A3B8"
            style={styles.nativeInput}
            secureTextEntry={true}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            textContentType="password"
          />
          {password.length > 0 && (
            <TouchableOpacity onPress={() => setPassword("")} style={styles.clearBtn}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <Button
          mode="contained"
          buttonColor="#5568FF"
          textColor="#FFFFFF"
          onPress={handleLogin}
          loading={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Login
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: "#64748B" }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text variant="bodyMedium" style={styles.link}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── API Configuration Modal (Completely IME duplicate-proof) ── */}
      <Portal>
        <Modal
          visible={urlVisible}
          onDismiss={() => setUrlVisible(false)}
          contentContainerStyle={styles.urlModal}
        >
          <View style={styles.modalHeader}>
            <Server size={22} color="#5568FF" />
            <Text variant="titleLarge" style={styles.modalTitle}>
              API Configuration
            </Text>
          </View>
          <Text style={styles.modalSubtitle}>
            Configure backend FastAPI server address:
          </Text>

          {/* Native TextInput without paper controlled conflicts */}
          <View style={styles.urlInputBox}>
            <RNTextInput
              value={newUrl}
              onChangeText={setNewUrl}
              placeholder="http://192.168.100.18:8000"
              placeholderTextColor="#94A3B8"
              style={styles.urlNativeInput}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="url"
              textContentType="none"
            />
            {newUrl.length > 0 && (
              <TouchableOpacity onPress={() => setNewUrl("")} style={styles.clearBtn}>
                <X size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick preset chips */}
          <Text style={styles.presetLabel}>Quick Presets:</Text>
          <View style={styles.presetRow}>
            {[
              "http://192.168.100.18:8001",
              "http://10.0.2.2:8001",
              "http://127.0.0.1:8001",
            ].map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.presetChip,
                  newUrl === preset && styles.presetChipActive,
                ]}
                onPress={() => setNewUrl(preset)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    newUrl === preset && styles.presetChipTextActive,
                  ]}
                >
                  {preset.replace("http://", "")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              textColor="#64748B"
              style={styles.cancelBtn}
              onPress={() => setUrlVisible(false)}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor="#5568FF"
              textColor="#FFFFFF"
              onPress={saveUrl}
              style={styles.saveBtn}
              labelStyle={{ fontWeight: "bold" }}
            >
              Save
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    padding: 12,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    overflow: "hidden",
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontWeight: "bold",
    color: "#1E293B",
  },
  subtitle: {
    color: "#64748B",
    marginTop: 4,
    fontSize: 14,
  },
  form: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
    marginTop: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  nativeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  clearBtn: {
    padding: 6,
  },
  button: {
    marginTop: 18,
    borderRadius: 12,
    elevation: 3,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  link: {
    color: "#5568FF",
    fontWeight: "bold",
  },

  // Modal
  urlModal: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    margin: 20,
    borderRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  modalTitle: {
    fontWeight: "bold",
    color: "#1E293B",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16,
  },
  urlInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#5568FF",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  urlNativeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 20,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  presetChipActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#5568FF",
  },
  presetChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  presetChipTextActive: {
    color: "#5568FF",
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
  },
  cancelBtn: {
    borderColor: "#CBD5E1",
    borderRadius: 10,
  },
  saveBtn: {
    borderRadius: 10,
    elevation: 2,
  },
});

export default LoginScreen;
