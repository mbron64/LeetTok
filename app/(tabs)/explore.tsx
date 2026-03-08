import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useProblems } from "../../src/lib/hooks";
import { theme } from "../../src/constants/theme";
import type { Difficulty } from "../../src/types";

const FILTERS: Array<Difficulty | "All"> = ["All", "Easy", "Medium", "Hard"];

export default function ExploreScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Difficulty | "All">("All");

  const { problems, loading } = useProblems();

  const filtered = useMemo(() => {
    let result = problems;
    if (filter !== "All") {
      result = result.filter((p) => p.difficulty === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          String(p.number).includes(q),
      );
    }
    return result;
  }, [problems, filter, search]);

  const cardWidth = (width - 48) / 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top"]}>
      <View className="px-4 pb-2 pt-2">
        <Text className="mb-3 text-2xl font-bold text-white">Explore</Text>

        <View className="mb-3 flex-row items-center rounded-xl bg-[#1a1a1a] px-3 py-2.5">
          <Ionicons name="search" size={18} color="#5c6370" />
          <TextInput
            className="ml-2 flex-1 text-sm text-white"
            placeholder="Search problems..."
            placeholderTextColor="#5c6370"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#5c6370" />
            </Pressable>
          )}
        </View>

        <View className="mb-1 flex-row gap-2">
          {FILTERS.map((f) => {
            const isActive = filter === f;
            const bg =
              isActive && f !== "All"
                ? theme.difficulty[f as Difficulty]
                : isActive
                  ? theme.colors.text
                  : theme.colors.surfaceElevated;
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

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#fff" size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          numColumns={2}
          keyExtractor={(item) => String(item.number)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 16, marginTop: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Ionicons name="search-outline" size={48} color="#5c6370" />
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
                  params: { id: String(item.number) },
                })
              }
            >
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-gray-500">
                  #{item.number}
                </Text>
                <View
                  className="rounded-full px-2 py-0.5"
                  style={{
                    backgroundColor: theme.difficultyBg[item.difficulty],
                  }}
                >
                  <Text
                    className="text-[10px] font-bold"
                    style={{ color: theme.difficulty[item.difficulty] }}
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
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
