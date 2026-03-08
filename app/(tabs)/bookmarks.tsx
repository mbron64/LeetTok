import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sampleClips } from "../../src/constants/sampleData";
import { theme } from "../../src/constants/theme";
import type { Clip } from "../../src/types";

const INITIAL_BOOKMARKS = [
  sampleClips[0].id,
  sampleClips[2].id,
  sampleClips[5].id,
];

export default function BookmarksScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [bookmarkedIds] = useState<string[]>(INITIAL_BOOKMARKS);

  const bookmarkedClips = sampleClips.filter((c) =>
    bookmarkedIds.includes(c.id),
  );

  const cardWidth = (width - 48) / 2;

  if (bookmarkedClips.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top"]}>
        <View className="px-4 pb-2 pt-2">
          <Text className="text-2xl font-bold text-white">Bookmarks</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bookmark-outline" size={64} color="#5c6370" />
          <Text className="mt-4 text-base font-medium text-gray-500">
            No bookmarks yet
          </Text>
          <Text className="mt-1 text-xs text-gray-600">
            Save clips to watch them later
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top"]}>
      <View className="px-4 pb-2 pt-2">
        <Text className="mb-1 text-2xl font-bold text-white">Bookmarks</Text>
        <Text className="mb-2 text-xs text-gray-500">
          {bookmarkedClips.length} saved{" "}
          {bookmarkedClips.length === 1 ? "clip" : "clips"}
        </Text>
      </View>

      <FlatList
        data={bookmarkedClips}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        columnWrapperStyle={{ gap: 16, marginTop: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <BookmarkCard
            clip={item}
            width={cardWidth}
            onPress={() =>
              router.push({
                pathname: "/problem/[id]",
                params: { id: String(item.problemNumber) },
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

function BookmarkCard({
  clip,
  width,
  onPress,
}: {
  clip: Clip;
  width: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={{ width }}
      className="overflow-hidden rounded-2xl bg-[#111]"
      onPress={onPress}
    >
      {/* Thumbnail placeholder */}
      <View
        className="items-center justify-center"
        style={{
          height: width * 1.4,
          backgroundColor: "#1a1a1a",
        }}
      >
        <Ionicons name="play-circle" size={40} color="#5c6370" />
      </View>

      <View className="p-3">
        <View className="mb-1.5 flex-row items-center justify-between">
          <Text className="text-[10px] text-gray-500">
            #{clip.problemNumber}
          </Text>
          <View
            className="rounded-full px-2 py-0.5"
            style={{
              backgroundColor: theme.difficultyBg[clip.difficulty],
            }}
          >
            <Text
              className="text-[10px] font-bold"
              style={{ color: theme.difficulty[clip.difficulty] }}
            >
              {clip.difficulty}
            </Text>
          </View>
        </View>

        <Text className="text-xs font-semibold text-white" numberOfLines={2}>
          {clip.title}
        </Text>

        <Text className="mt-1 text-[10px] text-gray-500" numberOfLines={1}>
          @{clip.creator}
        </Text>
      </View>
    </Pressable>
  );
}
