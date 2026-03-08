import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { sampleChallenges } from "../../src/constants/sampleChallenges";
import { getReviewQueue, type ReviewItem } from "../../src/lib/review-queue";
import type { Challenge } from "../../src/types";
import InlineChallenge from "../../src/components/InlineChallenge";

export default function TopicDrillScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [reviewChallenges, setReviewChallenges] = useState<Challenge[]>([]);

  const isReviewMode = topic === "__review__";

  const challenges = useMemo(() => {
    if (isReviewMode) return reviewChallenges;
    return sampleChallenges.filter((ch) =>
      ch.tags.some((t) => t.toLowerCase() === topic?.toLowerCase()),
    );
  }, [topic, isReviewMode, reviewChallenges]);

  useEffect(() => {
    if (!isReviewMode) return;
    getReviewQueue().then((items: ReviewItem[]) => {
      const ids = new Set(items.map((i) => i.challengeId));
      setReviewChallenges(
        sampleChallenges.filter((ch) => ids.has(ch.id)),
      );
    });
  }, [isReviewMode]);

  const currentChallenge = challenges[currentIndex];

  const advance = useCallback(() => {
    if (currentIndex + 1 >= challenges.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, challenges.length]);

  const handleComplete = useCallback(
    (correct: boolean, xp: number) => {
      if (correct) setCorrectCount((c) => c + 1);
      setTotalXP((t) => t + xp);
      setTimeout(advance, 600);
    },
    [advance],
  );

  const handleSkip = useCallback(() => {
    setTimeout(advance, 400);
  }, [advance]);

  const displayTopic = isReviewMode ? "Review Queue" : topic ?? "Drill";

  if (challenges.length === 0 && !isReviewMode) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="search-outline" size={48} color="#333" />
          <Text className="mt-4 text-center text-base font-bold text-white">
            No challenges found
          </Text>
          <Text className="mt-1 text-center text-sm" style={{ color: "#666" }}>
            No challenges match the topic "{topic}"
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 rounded-xl px-6 py-3"
            style={{ backgroundColor: "#06b6d4" }}
          >
            <Text className="text-sm font-bold text-black">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    const accuracy =
      challenges.length > 0
        ? Math.round((correctCount / challenges.length) * 100)
        : 0;
    return (
      <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.duration(600)} className="items-center">
            <View
              className="mb-4 h-20 w-20 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(6,182,212,0.15)" }}
            >
              <Ionicons name="trophy" size={40} color="#06b6d4" />
            </View>
            <Text className="text-2xl font-bold text-white">
              {isReviewMode ? "Review Complete!" : "Drill Complete!"}
            </Text>
            <Text className="mt-1 text-sm" style={{ color: "#666" }}>
              {displayTopic}
            </Text>

            <View className="mt-6 flex-row gap-6">
              <View className="items-center">
                <Text className="text-2xl font-bold" style={{ color: "#06b6d4" }}>
                  {totalXP}
                </Text>
                <Text className="text-xs" style={{ color: "#666" }}>
                  XP Earned
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold" style={{ color: "#22c55e" }}>
                  {correctCount}/{challenges.length}
                </Text>
                <Text className="text-xs" style={{ color: "#666" }}>
                  Correct
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold" style={{ color: "#eab308" }}>
                  {accuracy}%
                </Text>
                <Text className="text-xs" style={{ color: "#666" }}>
                  Accuracy
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => router.back()}
              className="mt-8 w-full items-center rounded-xl py-3.5"
              style={{ backgroundColor: "#06b6d4" }}
            >
              <Text className="text-sm font-bold text-black">Back to Hub</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} className="px-5 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="flex-row items-center gap-1"
          >
            <Ionicons name="chevron-back" size={22} color="#888" />
            <Text className="text-sm" style={{ color: "#888" }}>
              Back
            </Text>
          </Pressable>

          <View className="items-center">
            <Text className="text-sm font-bold text-white">{displayTopic}</Text>
            <Text className="text-[10px]" style={{ color: "#666" }}>
              {isReviewMode ? "Spaced Repetition" : "Topic Drill"}
            </Text>
          </View>

          <View className="w-14" />
        </View>
      </Animated.View>

      {/* Progress Bar */}
      <View className="mx-5 mb-1">
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-xs font-bold" style={{ color: "#06b6d4" }}>
            {currentIndex + 1}/{challenges.length}
          </Text>
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={12} color="#06b6d4" />
            <Text className="text-xs font-bold" style={{ color: "#06b6d4" }}>
              {totalXP} XP
            </Text>
          </View>
        </View>
        <View
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "#1a1a1a" }}
        >
          <Animated.View
            className="h-full rounded-full"
            style={{
              backgroundColor: "#06b6d4",
              width: `${((currentIndex + 1) / challenges.length) * 100}%`,
            }}
          />
        </View>
      </View>

      {/* Challenge Area */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        key={currentChallenge?.id}
      >
        {currentChallenge && (
          <Animated.View entering={FadeInUp.duration(400)}>
            <InlineChallenge
              challenge={currentChallenge}
              onComplete={handleComplete}
              onSkip={handleSkip}
            />
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
