import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/lib/auth";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password) return;
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const err = await signUp(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center px-8"
      >
        <View className="mb-10 items-center">
          <Text className="text-4xl font-bold text-white">LeetTok</Text>
          <Text className="mt-2 text-sm text-gray-500">
            Create a new account
          </Text>
        </View>

        {error && (
          <View className="mb-4 rounded-xl bg-red-500/10 px-4 py-3">
            <Text className="text-center text-sm text-red-400">{error}</Text>
          </View>
        )}

        <View className="mb-4 rounded-xl bg-[#1a1a1a] px-4 py-3.5">
          <TextInput
            className="text-base text-white"
            placeholder="Email"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>

        <View className="mb-4 rounded-xl bg-[#1a1a1a] px-4 py-3.5">
          <TextInput
            className="text-base text-white"
            placeholder="Password"
            placeholderTextColor="#666"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />
        </View>

        <View className="mb-6 rounded-xl bg-[#1a1a1a] px-4 py-3.5">
          <TextInput
            className="text-base text-white"
            placeholder="Confirm Password"
            placeholderTextColor="#666"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
          />
        </View>

        <Pressable
          onPress={handleSignUp}
          disabled={loading}
          className="mb-6 items-center rounded-xl bg-[#6366f1] py-4"
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Sign Up</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace("/auth/login")}
          className="items-center"
        >
          <Text className="text-sm text-gray-500">
            Already have an account?{" "}
            <Text className="font-semibold text-[#818cf8]">Sign In</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
