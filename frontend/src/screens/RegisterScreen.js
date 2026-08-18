import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput as RNTextInput,
} from "react-native";
import { Text, Button, Surface } from "react-native-paper";
import { X, UserPlus, Mail, Lock, User } from "lucide-react-native";
import { register as registerApi } from "../api";
import { useAuth } from "../utils/AuthContext";

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const userData = await registerApi(name.trim(), email.trim(), password);
      await login(userData);
    } catch (error) {
      Alert.alert(
        "Registration Failed",
        error.response?.data?.detail || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Surface style={styles.logoContainer} elevation={4}>
          <Image
            source={require("../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Surface>
        <Text variant="headlineMedium" style={styles.title}>
          Create Account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Join Virtual Doctor for better health
        </Text>
      </View>

      <View style={styles.form}>
        {/* Full Name */}
        <Text style={styles.inputLabel}>Full Name</Text>
        <View style={styles.inputWrapper}>
          <RNTextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor="#94A3B8"
            style={styles.nativeInput}
            autoCorrect={false}
            spellCheck={false}
          />
          {name.length > 0 && (
            <TouchableOpacity onPress={() => setName("")} style={styles.clearBtn}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Email */}
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

        {/* Password */}
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
          onPress={handleRegister}
          loading={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Register
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium" style={{ color: "#64748B" }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text variant="bodyMedium" style={styles.link}>
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginBottom: 28,
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
});

export default RegisterScreen;
