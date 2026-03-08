import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/lib/auth";
import { signInWithProvider } from "../../src/lib/oauth";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(
    null
  );
  const [oauthError, setOauthError] = useState<string | null>(null);

  const isOauthInProgress = oauthLoading !== null;

  const handleOAuth = async (provider: "github" | "google") => {
    setOauthError(null);
    setOauthLoading(provider);
    const err = await signInWithProvider(provider);
    setOauthLoading(null);
    if (err) setOauthError(err);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <Pressable
        onPress={() => router.back()}
        style={{ position: "absolute", top: 60, left: 16, zIndex: 10, height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)" }}
      >
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32 }}
      >
        <View className="mb-10 items-center">
          <View style={{ width: 140, height: 126, borderRadius: 32, overflow: "hidden", marginBottom: 12 }}>
            <Image
              source={require("../../assets/images/icon.png")}
              style={{ width: 182, height: 182, marginTop: -21, marginLeft: -21 }}
            />
          </View>
          <Text className="text-4xl font-bold text-white">LeetTok</Text>
          <Text className="mt-2 text-sm text-gray-500">
            Sign in to your account
          </Text>
        </View>

        <Pressable
          onPress={() => handleOAuth("github")}
          disabled={isOauthInProgress}
          className="mb-3 flex-row items-center justify-center rounded-xl py-4"
          style={{
            backgroundColor: "#24292e",
            opacity: isOauthInProgress ? 0.6 : 1,
          }}
        >
          {oauthLoading === "github" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-github" size={22} color="#fff" />
              <Text className="ml-2 text-base font-semibold text-white">
                Continue with GitHub
              </Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => handleOAuth("google")}
          disabled={isOauthInProgress}
          className="mb-4 flex-row items-center justify-center rounded-xl py-4"
          style={{
            backgroundColor: "#fff",
            opacity: isOauthInProgress ? 0.6 : 1,
          }}
        >
          {oauthLoading === "google" ? (
            <ActivityIndicator color="#333" />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color="#333" />
              <Text className="ml-2 text-base font-semibold text-[#333]">
                Continue with Google
              </Text>
            </>
          )}
        </Pressable>

        {oauthError && (
          <Text className="mb-4 text-center text-sm text-red-400">
            {oauthError}
          </Text>
        )}

        <View className="mb-4 flex-row items-center justify-center gap-3">
          <View className="h-px flex-1 bg-gray-600" />
          <Text className="text-sm text-gray-500">— or —</Text>
          <View className="h-px flex-1 bg-gray-600" />
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
            placeholderTextColor="#5c6370"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>

        <View className="mb-6 rounded-xl bg-[#1a1a1a] px-4 py-3.5">
          <TextInput
            className="text-base text-white"
            placeholder="Password"
            placeholderTextColor="#5c6370"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
        </View>

        <Pressable
          onPress={handleSignIn}
          disabled={loading || isOauthInProgress}
          className="mb-6 items-center rounded-xl bg-white py-4"
          style={{ opacity: loading || isOauthInProgress ? 0.6 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-base font-semibold text-black">Sign In</Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace("/auth/register")}
          className="items-center"
        >
          <Text className="text-sm text-gray-500">
            Don't have an account?{" "}
            <Text className="font-semibold text-white">Sign Up</Text>
          </Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
