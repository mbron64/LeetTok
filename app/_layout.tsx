import "../global.css";

import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "../src/lib/auth";
import { ONBOARDING_COMPLETE_KEY } from "./onboarding";
import { theme } from "../src/constants/theme";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY).then((value) => {
      setNeedsOnboarding(value !== "true");
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready && needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [ready, needsOnboarding, router]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="onboarding"
          options={{ animation: "fade" }}
        />
        <Stack.Screen
          name="problem/[id]"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen
          name="auth/login"
          options={{ animation: "fade" }}
        />
        <Stack.Screen
          name="auth/register"
          options={{ animation: "fade" }}
        />
      </Stack>
    </AuthProvider>
  );
}
