import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  Surface,
  Portal,
  Modal,
  TextInput as PaperTextInput,
} from "react-native-paper";
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

  React.useEffect(() => {
    loadSavedUrl();
  }, []);

  const loadSavedUrl = async () => {
    const saved = await AsyncStorage.getItem("api_base_url");
    if (saved) {
      setBaseURL(saved);
      setNewUrl(saved);
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
    if (newUrl) {
      await AsyncStorage.setItem("api_base_url", newUrl);
      setBaseURL(newUrl);
      setUrlVisible(false);
      Alert.alert("Success", "API URL updated successfully");
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      const userData = await loginApi(email, password);
      await login(userData);
    } catch (error) {
      Alert.alert(
        "Login Failed",
        error.response?.data?.detail || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
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
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry={true}
        />
        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Login
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Register")}>
            <Text variant="bodyMedium" style={styles.link}>
              Register
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Portal>
        <Modal
          visible={urlVisible}
          onDismiss={() => setUrlVisible(false)}
          contentContainerStyle={styles.urlModal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            API Configuration
          </Text>
          <PaperTextInput
            label="Base URL"
            value={newUrl}
            onChangeText={setNewUrl}
            mode="outlined"
            placeholder="http://192.168.x.x:8001"
            style={styles.modalInput}
          />
          <View style={styles.modalButtons}>
            <Button onPress={() => setUrlVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={saveUrl} style={styles.saveBtn}>
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
    backgroundColor: "#FFF",
    padding: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    padding: 10,
    borderRadius: 30,
    backgroundColor: "#FFF",
    marginBottom: 20,
    overflow: "hidden",
  },
  logo: {
    width: 100,
    height: 100,
  },
  title: {
    fontWeight: "bold",
    color: "#5A5F73",
  },
  subtitle: {
    color: "#8A8FA3",
    marginTop: 8,
  },
  form: {
    width: "100%",
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#5568FF",
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  link: {
    color: "#5568FF",
    fontWeight: "bold",
  },
  urlModal: {
    backgroundColor: "white",
    padding: 24,
    margin: 20,
    borderRadius: 16,
  },
  modalTitle: {
    marginBottom: 20,
    fontWeight: "bold",
  },
  modalInput: {
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  saveBtn: {
    marginLeft: 12,
  },
});

export default LoginScreen;
