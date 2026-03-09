import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../src/constants/theme";
import type { Difficulty } from "../src/types";

export const ONBOARDING_COMPLETE_KEY = "leettok_onboarding_complete";
export const PREFERRED_DIFFICULTIES_KEY = "leettok_preferred_difficulties";
export const PREFERRED_TOPICS_KEY = "leettok_preferred_topics";
export const INTERVIEW_GOAL_KEY = "leettok_interview_goal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type GoalOption = {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  difficulties: Difficulty[];
  topics: string[];
};

const GOALS: GoalOption[] = [
  {
    id: "palantir",
    label: "Palantir Mode",
    subtitle: "Graphs, edge cases, and hard-core problem solving",
    icon: "diamond-outline",
    difficulties: ["Medium", "Hard"],
    topics: [
      "Array",
      "Hash Table",
      "Graph",
      "Tree",
      "Binary Search",
      "Heap",
      "Greedy",
      "Dynamic Programming",
      "Stack",
    ],
  },
  {
    id: "mid-tier",
    label: "Top Startups",
    subtitle: "Credal, Stripe, Uber, Airbnb, Coinbase, etc.",
    icon: "trending-up-outline",
    difficulties: ["Medium", "Hard"],
    topics: [
      "Array",
      "String",
      "Hash Table",
      "Dynamic Programming",
      "Tree",
      "Graph",
      "Binary Search",
      "Stack",
    ],
  },
  {
    id: "faang",
    label: "FAANG / Big Tech",
    subtitle: "Google, Meta, Amazon, Apple, Microsoft",
    icon: "rocket-outline",
    difficulties: ["Medium", "Hard"],
    topics: [
      "Dynamic Programming",
      "Graph",
      "Tree",
      "Binary Search",
      "Two Pointers",
      "Sliding Window",
      "Heap",
      "Trie",
      "Backtracking",
    ],
  },
  {
    id: "new-grad",
    label: "New Grad / Intern",
    subtitle: "Breaking into tech for the first time",
    icon: "school-outline",
    difficulties: ["Easy", "Medium"],
    topics: [
      "Array",
      "String",
      "Hash Table",
      "Stack",
      "Linked List",
      "Two Pointers",
      "Recursion",
      "Greedy",
    ],
  },
  {
    id: "competitive",
    label: "Competitive / Grind Mode",
    subtitle: "I want the hardest problems you have",
    icon: "flame-outline",
    difficulties: ["Medium", "Hard"],
    topics: [
      "Dynamic Programming",
      "Graph",
      "Tree",
      "Backtracking",
      "Trie",
      "Heap",
      "Binary Search",
      "Sliding Window",
      "Greedy",
    ],
  },
];

const TOPICS = [
  "Array",
  "String",
  "Hash Table",
  "Dynamic Programming",
  "Tree",
  "Graph",
  "Binary Search",
  "Stack",
  "Linked List",
  "Two Pointers",
  "Sliding Window",
  "Recursion",
  "Backtracking",
  "Greedy",
  "Heap",
  "Trie",
];

const TOPIC_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  Array: "grid-outline",
  String: "text-outline",
  "Hash Table": "key-outline",
  "Dynamic Programming": "layers-outline",
  Tree: "git-branch-outline",
  Graph: "share-social-outline",
  "Binary Search": "search-outline",
  Stack: "albums-outline",
  "Linked List": "link-outline",
  "Two Pointers": "swap-horizontal-outline",
  "Sliding Window": "resize-outline",
  Recursion: "repeat-outline",
  Backtracking: "return-up-back-outline",
  Greedy: "flash-outline",
  Heap: "triangle-outline",
  Trie: "git-merge-outline",
};

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setCurrentPage(page);
    },
    [],
  );

  const goNext = useCallback(() => {
    if (currentPage < 2) {
      scrollRef.current?.scrollTo({
        x: (currentPage + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  }, [currentPage]);

  const selectGoal = useCallback((goalId: string) => {
    setSelectedGoal(goalId);
    const goal = GOALS.find((g) => g.id === goalId);
    if (goal) {
      setSelectedTopics(new Set(goal.topics));
    }
  }, []);

  const toggleTopic = useCallback((t: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  const handleComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");

    const goal = GOALS.find((g) => g.id === selectedGoal);
    if (goal) {
      await AsyncStorage.setItem(INTERVIEW_GOAL_KEY, goal.id);
      await AsyncStorage.setItem(
        PREFERRED_DIFFICULTIES_KEY,
        JSON.stringify(goal.difficulties),
      );
    }

    if (selectedTopics.size > 0) {
      await AsyncStorage.setItem(
        PREFERRED_TOPICS_KEY,
        JSON.stringify([...selectedTopics]),
      );
    }

    router.replace("/");
  }, [router, selectedGoal, selectedTopics]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
      >
        {contentHeight > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={onScroll}
          >
            <View style={{ width: SCREEN_WIDTH, height: contentHeight }}>
              <WelcomeSlide />
            </View>
            <View style={{ width: SCREEN_WIDTH, height: contentHeight }}>
              <GoalSlide
                selected={selectedGoal}
                onSelect={selectGoal}
              />
            </View>
            <View style={{ width: SCREEN_WIDTH, height: contentHeight }}>
              <TopicsSlide
                selected={selectedTopics}
                onToggle={toggleTopic}
              />
            </View>
          </ScrollView>
        )}
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                height: 8,
                borderRadius: 4,
                width: i === currentPage ? 24 : 8,
                backgroundColor:
                  i === currentPage ? "#ffffff" : theme.colors.surfaceElevated,
              }}
            />
          ))}
        </View>

        {currentPage < 2 ? (
          <Pressable
            onPress={goNext}
            style={{
              alignItems: "center",
              borderRadius: 16,
              paddingVertical: 16,
              backgroundColor: "#ffffff",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>
              Next
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleComplete}
            style={{
              alignItems: "center",
              borderRadius: 16,
              paddingVertical: 16,
              backgroundColor: "#ffffff",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>
              Get Started
            </Text>
          </Pressable>
        )}

        {currentPage < 2 && (
          <Pressable
            onPress={handleComplete}
            style={{ marginTop: 12, alignItems: "center", paddingVertical: 8 }}
          >
            <Text style={{ fontSize: 14, color: "#afb3b6" }}>
              Skip
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function WelcomeSlide() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
      }}
    >
      <View
        style={{
          marginBottom: 24,
          height: 180,
          width: 200,
          borderRadius: 44,
          overflow: "hidden",
        }}
      >
        <Image
          source={require("../assets/images/icon.png")}
          style={{
            height: 260,
            width: 260,
            marginTop: -30,
            marginLeft: -30,
          }}
        />
      </View>

      <Text
        style={{
          marginBottom: 12,
          textAlign: "center",
          fontSize: 36,
          fontWeight: "700",
          color: "#fff",
        }}
      >
        LeetTok
      </Text>

      <Text
        style={{
          marginBottom: 16,
          textAlign: "center",
          fontSize: 18,
          lineHeight: 28,
          color: "#afb3b6",
        }}
      >
        Doomscroll your way to a job.
      </Text>

      <View style={{ marginTop: 24, gap: 16 }}>
        <FeatureRow icon="play-circle" text="TikTok-style LeetCode walkthroughs" />
        <FeatureRow icon="code-slash" text="Solve problems right in the app" />
        <FeatureRow icon="flash-outline" text="Addictive algorithm, productive scroll" />
      </View>
    </View>
  );
}

function FeatureRow({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          height: 40,
          width: 40,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      >
        <Ionicons name={icon} size={20} color="#afb3b6" />
      </View>
      <Text style={{ fontSize: 16, color: "#fff" }}>{text}</Text>
    </View>
  );
}

function GoalSlide({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        paddingHorizontal: 32,
        paddingTop: 48,
        paddingBottom: 16,
      }}
      showsVerticalScrollIndicator={false}
    >
      <Text
        style={{
          marginBottom: 8,
          textAlign: "center",
          fontSize: 30,
          fontWeight: "700",
          color: "#fff",
        }}
      >
        What's your goal?
      </Text>
      <Text
        style={{
          marginBottom: 32,
          textAlign: "center",
          fontSize: 16,
          color: "#afb3b6",
        }}
      >
        We'll tailor your feed to match
      </Text>

      <View style={{ gap: 12 }}>
        {GOALS.map((goal) => {
          const isSelected = selected === goal.id;
          return (
            <Pressable
              key={goal.id}
              onPress={() => onSelect(goal.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 16,
                borderWidth: 2,
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderColor: isSelected ? "#fbb862" : theme.colors.surfaceElevated,
                backgroundColor: isSelected
                  ? "rgba(251,184,98,0.08)"
                  : theme.colors.surface,
              }}
            >
              <View
                style={{
                  marginRight: 14,
                  height: 44,
                  width: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: isSelected
                    ? "rgba(251,184,98,0.15)"
                    : "rgba(255,255,255,0.08)",
                }}
              >
                <Ionicons
                  name={goal.icon}
                  size={24}
                  color={isSelected ? "#fbb862" : "#afb3b6"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}
                >
                  {goal.label}
                </Text>
                <Text
                  style={{
                    marginTop: 2,
                    fontSize: 12,
                    color: "#5c6370",
                  }}
                >
                  {goal.subtitle}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color="#fbb862" />
              )}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function TopicsSlide({
  selected,
  onToggle,
}: {
  selected: Set<string>;
  onToggle: (t: string) => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 48 }}>
      <Text
        style={{
          marginBottom: 8,
          textAlign: "center",
          fontSize: 30,
          fontWeight: "700",
          color: "#fff",
        }}
      >
        Fine-tune Topics
      </Text>
      <Text
        style={{
          marginBottom: 32,
          textAlign: "center",
          fontSize: 16,
          color: "#afb3b6",
        }}
      >
        Pre-selected based on your goal. Adjust if you want.
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {TOPICS.map((t) => {
          const isSelected = selected.has(t);
          return (
            <Pressable
              key={t}
              onPress={() => onToggle(t)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                borderWidth: 1,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderColor: isSelected
                  ? "#fbb862"
                  : theme.colors.surfaceElevated,
                backgroundColor: isSelected
                  ? "rgba(251,184,98,0.1)"
                  : theme.colors.surface,
              }}
            >
              <Ionicons
                name={TOPIC_ICONS[t] ?? "code-outline"}
                size={16}
                color={isSelected ? "#fbb862" : "#5c6370"}
              />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: isSelected ? "#fbb862" : "#afb3b6",
                }}
              >
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
