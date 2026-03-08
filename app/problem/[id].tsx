import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import VideoFeed from "../../src/components/VideoFeed";
import { sampleClips } from "../../src/constants/sampleData";
import { theme } from "../../src/constants/theme";

export default function ProblemFeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const problemNumber = Number(id);
  const clips = useMemo(
    () => sampleClips.filter((c) => c.problemNumber === problemNumber),
    [problemNumber],
  );

  const problem = clips[0];

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />

      {clips.length > 0 ? (
        <VideoFeed clips={clips} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="videocam-off-outline" size={48} color="#5c6370" />
          <Text className="mt-3 text-sm text-gray-500">
            No clips for this problem
          </Text>
        </View>
      )}

      {/* Floating header */}
      <SafeAreaView
        style={{ position: "absolute", left: 0, right: 0, top: 0 }}
        edges={["top"]}
        pointerEvents="box-none"
      >
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => router.back()}
            className="h-9 w-9 items-center justify-center rounded-full bg-black/50"
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>

          {problem && (
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }} pointerEvents="none">
              <Text
                className="shrink text-base font-bold text-white"
                numberOfLines={1}
              >
                {problem.problemNumber}. {problem.title}
              </Text>
              <View
                className="rounded-full px-2 py-0.5"
                style={{
                  backgroundColor: theme.difficulty[problem.difficulty],
                }}
              >
                <Text className="text-[10px] font-bold text-white">
                  {problem.difficulty}
                </Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
