import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sampleClips } from "../../src/constants/sampleData";
import type { Clip, Difficulty } from "../../src/types";

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Easy: "#22c55e",
  Medium: "#eab308",
  Hard: "#ef4444",
};

const FILTERS: Array<Difficulty | "All"> = ["All", "Easy", "Medium", "Hard"];

type Problem = {
  problemNumber: number;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  clipCount: number;
};

function extractProblems(clips: Clip[]): Problem[] {
  const map = new Map<number, Problem>();
  for (const clip of clips) {
    const existing = map.get(clip.problemNumber);
    if (existing) {
      existing.clipCount++;
      for (const t of clip.topics) {
        if (!existing.topics.includes(t)) existing.topics.push(t);
      }
    } else {
      map.set(clip.problemNumber, {
        problemNumber: clip.problemNumber,
        title: clip.title,
        difficulty: clip.difficulty,
        topics: [...clip.topics],
        clipCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => a.problemNumber - b.problemNumber,
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Difficulty | "All">("All");

  const allProblems = useMemo(() => extractProblems(sampleClips), []);

  const filtered = useMemo(() => {
    let result = allProblems;
    if (filter !== "All") {
      result = result.filter((p) => p.difficulty === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          String(p.problemNumber).includes(q),
      );
    }
    return result;
  }, [allProblems, filter, search]);

  const cardWidth = (width - 48) / 2;

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <View className="px-4 pb-2 pt-2">
        <Text className="mb-3 text-2xl font-bold text-white">Explore</Text>

        <View className="mb-3 flex-row items-center rounded-xl bg-[#1a1a1a] px-3 py-2.5">
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            className="ml-2 flex-1 text-sm text-white"
            placeholder="Search problems..."
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </Pressable>
          )}
        </View>

        <View className="mb-1 flex-row gap-2">
          {FILTERS.map((f) => {
            const isActive = filter === f;
            const bg =
              isActive && f !== "All"
                ? DIFFICULTY_COLORS[f as Difficulty]
                : isActive
                  ? "#fff"
                  : "#1a1a1a";
            const textColor = isActive && f === "All" ? "#000" : "#fff";

            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                className="rounded-full px-4 py-1.5"
                style={{ backgroundColor: bg }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: textColor }}
                >
                  {f}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={(item) => String(item.problemNumber)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        columnWrapperStyle={{ gap: 16, marginTop: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="mt-20 items-center">
            <Ionicons name="search-outline" size={48} color="#333" />
            <Text className="mt-3 text-sm text-gray-500">
              No problems found
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={{ width: cardWidth }}
            className="rounded-2xl bg-[#111] p-4"
            onPress={() =>
              router.push({
                pathname: "/problem/[id]",
                params: { id: String(item.problemNumber) },
              })
            }
          >
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-xs font-medium text-gray-500">
                #{item.problemNumber}
              </Text>
              <View
                className="rounded-full px-2 py-0.5"
                style={{
                  backgroundColor:
                    DIFFICULTY_COLORS[item.difficulty] + "20",
                }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: DIFFICULTY_COLORS[item.difficulty] }}
                >
                  {item.difficulty}
                </Text>
              </View>
            </View>

            <Text
              className="mb-3 text-sm font-semibold text-white"
              numberOfLines={2}
            >
              {item.title}
            </Text>

            <View className="flex-row flex-wrap gap-1">
              {item.topics.slice(0, 3).map((topic) => (
                <View
                  key={topic}
                  className="rounded-full bg-white/10 px-2 py-0.5"
                >
                  <Text className="text-[10px] text-gray-400">{topic}</Text>
                </View>
              ))}
            </View>

            <View className="mt-3 flex-row items-center gap-1">
              <Ionicons name="play-circle" size={12} color="#666" />
              <Text className="text-[10px] text-gray-500">
                {item.clipCount} {item.clipCount === 1 ? "clip" : "clips"}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
