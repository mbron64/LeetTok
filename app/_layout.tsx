import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { AuthProvider } from "../src/lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#000" },
        }}
      >
        <Stack.Screen name="(tabs)" />
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
