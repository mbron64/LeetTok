import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../../src/lib/auth";
import { isSupabaseConfigured } from "../../src/constants/config";
import { theme } from "../../src/constants/theme";
import { useMadLeetsEnabled } from "../../src/lib/madleets-preferences";
import { getProgress, type ProgressData } from "../../src/lib/progress";
import { checkStreakAtRisk } from "../../src/lib/streak";
import ProgressStats from "../../src/components/ProgressStats";

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const { enabled: madLeetsEnabled, toggle: toggleMadLeets } =
    useMadLeetsEnabled();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [streakAtRisk, setStreakAtRisk] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProgress().then((data) => {
        setProgress(data);
        setStreakAtRisk(checkStreakAtRisk(data.streak.lastChallengeDate));
      });
    }, []),
  );

  const displayName = user?.email?.split("@")[0] ?? "LeetTok User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center px-4 pb-6 pt-6">
          <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-[#6366f1]">
            <Text className="text-3xl font-bold text-white">{initial}</Text>
          </View>
          <Text className="text-xl font-bold text-white">{displayName}</Text>
          {user?.email && (
            <Text className="mt-1 text-sm text-gray-500">{user.email}</Text>
          )}
          {!isSupabaseConfigured && (
            <Text className="mt-1 text-xs text-gray-600">
              Offline mode — Supabase not configured
            </Text>
          )}
        </View>

        {/* Quick stats bar */}
        <View className="mx-4 mb-6 flex-row rounded-2xl bg-[#111] p-4">
          <View className="flex-1 items-center border-r border-[#222]">
            <Text className="text-2xl font-bold text-white">
              {progress?.totalXP.toLocaleString() ?? "0"}
            </Text>
            <Text className="mt-0.5 text-[10px] text-gray-500">Total XP</Text>
          </View>
          <View className="flex-1 items-center border-r border-[#222]">
            <Text className="text-2xl font-bold text-white">
              {progress?.challengesCompleted ?? 0}
            </Text>
            <Text className="mt-0.5 text-[10px] text-gray-500">Problems</Text>
          </View>
          <View className="flex-1 items-center">
            <View className="flex-row items-center gap-1">
              <Text className="text-2xl font-bold text-white">
                {progress?.streak.currentStreak ?? 0}
              </Text>
              <Text className="text-base">🔥</Text>
            </View>
            <Text className="mt-0.5 text-[10px] text-gray-500">
              {streakAtRisk ? "At risk!" : "Day Streak"}
            </Text>
          </View>
        </View>

        {/* Full progress stats */}
        {progress && <ProgressStats data={progress} />}

        <View className="mx-4 mt-6">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Settings
          </Text>

          <View className="overflow-hidden rounded-2xl bg-[#111]">
            <View className="flex-row items-center justify-between border-b border-[#1a1a1a] px-4 py-3.5">
              <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-[#6366f1]/20">
                  <Ionicons name="moon" size={16} color="#818cf8" />
                </View>
                <Text className="text-sm text-white">Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{
                  false: theme.colors.textDim,
                  true: theme.colors.accent,
                }}
                thumbColor={theme.colors.text}
              />
            </View>

            <View className="flex-row items-center justify-between border-b border-[#1a1a1a] px-4 py-3.5">
              <View className="flex-row items-center gap-3">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20">
                  <Ionicons name="code-slash" size={16} color="#06b6d4" />
                </View>
                <Text className="text-sm text-white">MadLeets Challenges</Text>
              </View>
              <Switch
                value={madLeetsEnabled}
                onValueChange={toggleMadLeets}
                trackColor={{ false: theme.colors.textDim, true: "#06b6d4" }}
                thumbColor={theme.colors.text}
              />
            </View>

            <SettingsRow
              icon="notifications"
              iconColor="#eab308"
              iconBg="bg-[#eab308]/20"
              label="Notifications"
              showBorder
            />

            <SettingsRow
              icon="information-circle"
              iconColor="#22c55e"
              iconBg="bg-[#22c55e]/20"
              label="About"
              showBorder={!!user}
            />

            {user && (
              <Pressable
                onPress={signOut}
                className="flex-row items-center gap-3 px-4 py-3.5"
              >
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                  <Ionicons name="log-out" size={16} color="#ef4444" />
                </View>
                <Text className="text-sm text-red-400">Sign Out</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View className="mt-8 items-center">
          <Text className="text-xs text-gray-600">LeetTok v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  iconColor,
  iconBg,
  label,
  showBorder = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
  label: string;
  showBorder?: boolean;
}) {
  return (
    <Pressable
      className={`flex-row items-center justify-between px-4 py-3.5 ${showBorder ? "border-b border-[#1a1a1a]" : ""}`}
    >
      <View className="flex-row items-center gap-3">
        <View
          className={`h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text className="text-sm text-white">{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#333" />
    </Pressable>
  );
}
