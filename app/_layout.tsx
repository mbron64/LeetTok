import "../global.css";

import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "../src/lib/auth";
import { initTracking, cleanupTracking } from "../src/lib/track";
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
    initTracking();
    return cleanupTracking;
  }, []);

  useEffect(() => {
    if (ready && needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [ready, needsOnboarding, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <ActivityIndicator color={theme.colors.textSecondary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            name="drill/[topic]"
            options={{ animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="challenge-only"
            options={{ animation: "slide_from_bottom" }}
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
    </GestureHandlerRootView>
  );
}
