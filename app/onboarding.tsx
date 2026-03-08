import React, { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
  ViewToken,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

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
  const listRef = useRef<FlatList>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Set<Difficulty>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentPage(viewableItems[0].index);
      }
    },
  ).current;

  const goNext = useCallback(() => {
    if (currentPage < 2) {
      listRef.current?.scrollToIndex({ index: currentPage + 1, animated: true });
    }
  }, [currentPage]);

  const toggleDifficulty = useCallback((d: Difficulty) => {
    setSelectedDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
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

    if (selectedDifficulties.size > 0) {
      await AsyncStorage.setItem(
        PREFERRED_DIFFICULTIES_KEY,
        JSON.stringify([...selectedDifficulties]),
      );
    }
    if (selectedTopics.size > 0) {
      await AsyncStorage.setItem(
        PREFERRED_TOPICS_KEY,
        JSON.stringify([...selectedTopics]),
      );
    }

    router.replace("/");
  }, [router, selectedDifficulties, selectedTopics]);

  const screens = [
    <WelcomeSlide key="welcome" />,
    <DifficultySlide
      key="difficulty"
      selected={selectedDifficulties}
      onToggle={toggleDifficulty}
    />,
    <TopicsSlide
      key="topics"
      selected={selectedTopics}
      onToggle={toggleTopic}
    />,
  ];

  return (
    <SafeAreaView className="flex-1 bg-black">
      <FlatList
        ref={listRef}
        data={screens}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>{item}</View>
        )}
      />

      <View className="px-6 pb-4">
        <View className="mb-6 flex-row items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="h-2 rounded-full"
              style={{
                width: i === currentPage ? 24 : 8,
                backgroundColor:
                  i === currentPage ? theme.colors.accent : theme.colors.surfaceElevated,
              }}
            />
          ))}
        </View>

        {currentPage < 2 ? (
          <Pressable
            onPress={goNext}
            className="items-center rounded-2xl py-4"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <Text className="text-base font-bold text-white">Next</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleComplete}
            className="items-center rounded-2xl py-4"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <Text className="text-base font-bold text-white">Get Started</Text>
          </Pressable>
        )}

        {currentPage < 2 && (
          <Pressable onPress={handleComplete} className="mt-3 items-center py-2">
            <Text className="text-sm" style={{ color: theme.colors.textMuted }}>
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
    <View className="flex-1 items-center justify-center px-8">
      <View
        className="mb-8 h-28 w-28 items-center justify-center rounded-[32px]"
        style={{ backgroundColor: theme.colors.accentDim }}
      >
        <Ionicons name="code-slash" size={56} color={theme.colors.accentLight} />
      </View>

      <Text className="mb-3 text-center text-4xl font-bold text-white">
        LeetTok
      </Text>

      <Text
        className="mb-4 text-center text-lg leading-7"
        style={{ color: theme.colors.textSecondary }}
      >
        Swipe through bite-sized LeetCode explanations. Learn algorithms the way
        you scroll — one clip at a time.
      </Text>

      <View className="mt-6 gap-4">
        <FeatureRow icon="play-circle" text="Short-form video solutions" />
        <FeatureRow icon="trending-up" text="Track your progress" />
        <FeatureRow icon="bulb-outline" text="Personalized recommendations" />
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
    <View className="flex-row items-center gap-3">
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: theme.colors.accentDim }}
      >
        <Ionicons name={icon} size={20} color={theme.colors.accentLight} />
      </View>
      <Text className="text-base text-white">{text}</Text>
    </View>
  );
}

function DifficultySlide({
  selected,
  onToggle,
}: {
  selected: Set<Difficulty>;
  onToggle: (d: Difficulty) => void;
}) {
  return (
    <View className="flex-1 justify-center px-8">
      <Text className="mb-2 text-center text-3xl font-bold text-white">
        Your Level
      </Text>
      <Text
        className="mb-10 text-center text-base"
        style={{ color: theme.colors.textSecondary }}
      >
        Which difficulties are you practicing?
      </Text>

      <View className="gap-4">
        {DIFFICULTIES.map((d) => {
          const isSelected = selected.has(d);
          const color = theme.difficulty[d];
          return (
            <Pressable
              key={d}
              onPress={() => onToggle(d)}
              className="flex-row items-center rounded-2xl border-2 px-5 py-5"
              style={{
                borderColor: isSelected ? color : theme.colors.surfaceElevated,
                backgroundColor: isSelected
                  ? `${color}15`
                  : theme.colors.surface,
              }}
            >
              <View
                className="mr-4 h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}25` }}
              >
                <Ionicons
                  name={
                    d === "Easy"
                      ? "leaf-outline"
                      : d === "Medium"
                        ? "flame-outline"
                        : "skull-outline"
                  }
                  size={24}
                  color={color}
                />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-white">{d}</Text>
                <Text
                  className="mt-0.5 text-xs"
                  style={{ color: theme.colors.textMuted }}
                >
                  {d === "Easy"
                    ? "Building foundations"
                    : d === "Medium"
                      ? "Interview standard"
                      : "Elite challenges"}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={color} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
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
    <View className="flex-1 px-8 pt-16">
      <Text className="mb-2 text-center text-3xl font-bold text-white">
        Pick Topics
      </Text>
      <Text
        className="mb-8 text-center text-base"
        style={{ color: theme.colors.textSecondary }}
      >
        What do you want to study?
      </Text>

      <View className="flex-row flex-wrap justify-center gap-3">
        {TOPICS.map((t) => {
          const isSelected = selected.has(t);
          return (
            <Pressable
              key={t}
              onPress={() => onToggle(t)}
              className="flex-row items-center gap-2 rounded-full border px-4 py-2.5"
              style={{
                borderColor: isSelected
                  ? theme.colors.accent
                  : theme.colors.surfaceElevated,
                backgroundColor: isSelected
                  ? theme.colors.accentDim
                  : theme.colors.surface,
              }}
            >
              <Ionicons
                name={TOPIC_ICONS[t] ?? "code-outline"}
                size={16}
                color={isSelected ? theme.colors.accentLight : theme.colors.textMuted}
              />
              <Text
                className="text-sm font-medium"
                style={{
                  color: isSelected ? theme.colors.accentLight : theme.colors.text,
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
