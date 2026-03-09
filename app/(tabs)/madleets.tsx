import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { sampleChallenges } from "../../src/constants/sampleChallenges";
import { getReviewQueue, type ReviewItem } from "../../src/lib/review-queue";
import { getProgress, type ProgressData } from "../../src/lib/progress";
import type { Challenge } from "../../src/types";
import InlineChallenge from "../../src/components/InlineChallenge";

const TOPIC_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Hash Table": "grid-outline",
  "Two Pointers": "swap-horizontal-outline",
  "Sliding Window": "resize-outline",
  Stack: "layers-outline",
  "Linked List": "link-outline",
  Design: "construct-outline",
  String: "text-outline",
  "Dynamic Programming": "trending-up-outline",
  "Binary Search": "search-outline",
  "Divide and Conquer": "git-branch-outline",
  Array: "albums-outline",
  Tree: "leaf-outline",
  Graph: "git-network-outline",
  Sorting: "funnel-outline",
  Recursion: "repeat-outline",
  Trie: "git-merge-outline",
  Memoization: "save-outline",
};

const TOPIC_COLORS: Record<string, string> = {
  "Hash Table": "#06b6d4",
  "Two Pointers": "#8b5cf6",
  "Sliding Window": "#f59e0b",
  Stack: "#ef4444",
  "Linked List": "#22c55e",
  Design: "#ec4899",
  String: "#afb3b6",
  "Dynamic Programming": "#f97316",
  "Binary Search": "#14b8a6",
  Array: "#3b82f6",
  Tree: "#84cc16",
  Graph: "#a855f7",
  Sorting: "#e879f9",
  Recursion: "#10b981",
  Trie: "#06b6d4",
  Memoization: "#fbb862",
  "Divide and Conquer": "#f43f5e",
};

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

function getTimeUntilMidnight(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diff = midnight.getTime() - now.getTime();
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const color =
    difficulty === "Easy"
      ? "#22c55e"
      : difficulty === "Medium"
        ? "#fbb862"
        : "#ef4444";
  const bg =
    difficulty === "Easy"
      ? "rgba(34,197,94,0.15)"
      : difficulty === "Medium"
        ? "rgba(251,184,98,0.15)"
        : "rgba(239,68,68,0.15)";
  return (
    <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: bg }}>
      <Text className="text-xs font-bold" style={{ color }}>
        {difficulty}
      </Text>
    </View>
  );
}

function CountdownTimer() {
  const [time, setTime] = useState(getTimeUntilMidnight);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeUntilMidnight()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <View className="flex-row items-center gap-1">
      <Ionicons name="time-outline" size={12} color="#888" />
      <Text className="text-xs font-mono" style={{ color: "#afb3b6" }}>
        {pad(time.hours)}:{pad(time.minutes)}:{pad(time.seconds)}
      </Text>
    </View>
  );
}

export default function MadLeetsScreen() {
  const router = useRouter();
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [showDailyChallenge, setShowDailyChallenge] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(false);

  const dailyChallenge = useMemo<Challenge>(() => {
    const dayIdx = getDayOfYear() % sampleChallenges.length;
    return sampleChallenges[dayIdx];
  }, []);

  const topicMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ch of sampleChallenges) {
      for (const tag of ch.tags) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]);
  }, []);

  const loadData = useCallback(async () => {
    const [queue, prog] = await Promise.all([
      getReviewQueue(),
      getProgress(),
    ]);
    setReviewItems(queue);
    setProgress(prog);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDailyComplete = useCallback(
    (_correct: boolean, _xp: number) => {
      setDailyCompleted(true);
      setShowDailyChallenge(false);
      loadData();
    },
    [loadData],
  );

  const handleDailySkip = useCallback(() => {
    setShowDailyChallenge(false);
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top"]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} className="px-5 pb-2 pt-4">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(6,182,212,0.15)" }}>
              <Ionicons name="code-slash" size={20} color="#06b6d4" />
            </View>
            <View>
              <Text className="text-xl font-bold text-white">MadLeets</Text>
              <Text className="text-xs" style={{ color: "#5c6370" }}>
                Challenge Hub
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Quick Stats Bar */}
        {progress && (
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            className="mx-5 mb-5 mt-3 flex-row items-center justify-around rounded-2xl py-3.5"
            style={{ backgroundColor: "#111111" }}
          >
            <View className="items-center">
              <View className="flex-row items-center gap-1">
                <Ionicons name="flame" size={16} color="#f59e0b" />
                <Text className="text-lg font-bold text-white">
                  {progress.streak.currentStreak}
                </Text>
              </View>
              <Text className="text-[10px]" style={{ color: "#5c6370" }}>
                Streak
              </Text>
            </View>
            <View className="h-6 w-px" style={{ backgroundColor: "#222" }} />
            <View className="items-center">
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={16} color="#06b6d4" />
                <Text className="text-lg font-bold text-white">
                  {progress.totalXP}
                </Text>
              </View>
              <Text className="text-[10px]" style={{ color: "#5c6370" }}>
                Total XP
              </Text>
            </View>
            <View className="h-6 w-px" style={{ backgroundColor: "#222" }} />
            <View className="items-center">
              <View className="flex-row items-center gap-1">
                <Ionicons name="checkmark-done" size={16} color="#22c55e" />
                <Text className="text-lg font-bold text-white">
                  {progress.accuracy}%
                </Text>
              </View>
              <Text className="text-[10px]" style={{ color: "#5c6370" }}>
                Accuracy
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Daily Challenge Card */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(400)}
          className="mx-5 mb-5 overflow-hidden rounded-2xl"
          style={{
            backgroundColor: "#111111",
            borderWidth: 1,
            borderColor: "rgba(6,182,212,0.2)",
          }}
        >
          <View
            className="px-4 py-3"
            style={{ backgroundColor: "rgba(6,182,212,0.06)" }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Ionicons name="today" size={18} color="#06b6d4" />
                <Text className="text-sm font-bold" style={{ color: "#06b6d4" }}>
                  Daily Challenge
                </Text>
              </View>
              <CountdownTimer />
            </View>
          </View>

          {showDailyChallenge ? (
            <View className="p-3">
              <InlineChallenge
                challenge={dailyChallenge}
                onComplete={handleDailyComplete}
                onSkip={handleDailySkip}
              />
            </View>
          ) : (
            <View className="p-4">
              <View className="mb-3 flex-row items-center gap-2">
                <Text className="text-base font-bold text-white">
                  Problem #{dailyChallenge.problemId}
                </Text>
                <DifficultyBadge difficulty={dailyChallenge.difficulty} />
              </View>

              <View className="mb-3 flex-row flex-wrap gap-1.5">
                {dailyChallenge.tags.map((tag) => (
                  <View
                    key={tag}
                    className="rounded-md px-2 py-0.5"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  >
                    <Text className="text-[10px]" style={{ color: "#afb3b6" }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="mb-3 flex-row items-center gap-1.5">
                <Ionicons name="code" size={14} color="#666" />
                <Text className="text-xs" style={{ color: "#5c6370" }}>
                  {dailyChallenge.language} · +{dailyChallenge.xpValue} XP
                </Text>
              </View>

              <Pressable
                onPress={() => setShowDailyChallenge(true)}
                disabled={dailyCompleted}
                className="items-center rounded-xl py-3.5"
                style={{
                  backgroundColor: dailyCompleted
                    ? "rgba(34,197,94,0.15)"
                    : "#06b6d4",
                }}
              >
                {dailyCompleted ? (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                    <Text className="text-sm font-bold" style={{ color: "#22c55e" }}>
                      Completed!
                    </Text>
                  </View>
                ) : (
                  <Text className="text-sm font-bold text-black">
                    Start Challenge
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* Review Queue */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          className="mx-5 mb-5 rounded-2xl p-4"
          style={{
            backgroundColor: "#111111",
            borderWidth: reviewItems.length > 0 ? 1 : 0,
            borderColor: "rgba(251,184,98,0.2)",
          }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: "rgba(251,184,98,0.15)" }}
              >
                <Ionicons name="refresh" size={16} color="#fbb862" />
              </View>
              <View>
                <Text className="text-sm font-bold text-white">Review Queue</Text>
                <Text className="text-xs" style={{ color: "#5c6370" }}>
                  {reviewItems.length > 0
                    ? `${reviewItems.length} challenge${reviewItems.length === 1 ? "" : "s"} to review`
                    : "All caught up!"}
                </Text>
              </View>
            </View>
            {reviewItems.length > 0 && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/drill/[topic]",
                    params: { topic: "__review__" },
                  })
                }
                className="flex-row items-center gap-1 rounded-lg px-3 py-2"
                style={{ backgroundColor: "rgba(251,184,98,0.15)" }}
              >
                <Ionicons name="play" size={14} color="#fbb862" />
                <Text className="text-xs font-bold" style={{ color: "#fbb862" }}>
                  Start Review
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Mode Selection */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} className="px-5 mb-4">
          <Text className="mb-3 text-sm font-bold" style={{ color: "#5c6370" }}>
            PRACTICE MODES
          </Text>

          {/* Challenge-Only Mode */}
          <Pressable
            onPress={() => router.push("/challenge-only")}
            className="mb-3 flex-row items-center rounded-2xl p-4"
            style={{
              backgroundColor: "#111111",
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.15)",
            }}
          >
            <View
              className="mr-3 h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(239,68,68,0.12)" }}
            >
              <Ionicons name="flash" size={24} color="#ef4444" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-bold text-white">Challenge Only</Text>
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: "rgba(239,68,68,0.2)" }}>
                  <Text className="text-[10px] font-bold" style={{ color: "#ef4444" }}>
                    2x XP
                  </Text>
                </View>
              </View>
              <Text className="text-xs" style={{ color: "#5c6370" }}>
                No hints, no video context — pure code
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#5c6370" />
          </Pressable>
        </Animated.View>

        {/* Topic Drill Grid */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} className="px-5 mb-4">
          <Text className="mb-3 text-sm font-bold" style={{ color: "#5c6370" }}>
            TOPIC DRILL
          </Text>

          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {topicMap.map(([topic, count], idx) => {
              const color = TOPIC_COLORS[topic] ?? "#afb3b6";
              const icon = TOPIC_ICONS[topic] ?? "code-outline";
              return (
                <Pressable
                  key={topic}
                  onPress={() =>
                    router.push({
                      pathname: "/drill/[topic]",
                      params: { topic },
                    })
                  }
                  className="items-center rounded-xl p-3"
                  style={{
                    backgroundColor: "#111111",
                    width: "47%",
                    flexGrow: 1,
                    borderWidth: 1,
                    borderColor: `${color}15`,
                  }}
                >
                  <View
                    className="mb-2 h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Ionicons name={icon} size={20} color={color} />
                  </View>
                  <Text className="text-xs font-bold text-white">{topic}</Text>
                  <Text className="text-[10px]" style={{ color: "#5c6370" }}>
                    {count} challenge{count === 1 ? "" : "s"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
