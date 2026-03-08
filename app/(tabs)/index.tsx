import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import VideoFeed from "../../src/components/VideoFeed";
import CategoryBar, { Category } from "../../src/components/CategoryBar";
import { useClips } from "../../src/lib/hooks";
import { recommendClips } from "../../src/lib/recommend";
import { theme } from "../../src/constants/theme";
import { sampleChallenges } from "../../src/constants/sampleChallenges";
import { useMadLeetsEnabled } from "../../src/lib/madleets-preferences";
import {
  PREFERRED_DIFFICULTIES_KEY,
  PREFERRED_TOPICS_KEY,
} from "../onboarding";
import type { Challenge, Difficulty } from "../../src/types";

export default function FeedScreen() {
  const { clips, loading } = useClips();
  const { enabled: madLeetsEnabled } = useMadLeetsEnabled();
  const [prefDifficulties, setPrefDifficulties] = useState<Difficulty[]>([]);
  const [prefTopics, setPrefTopics] = useState<string[]>([]);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("For You");

  const challengeMap = useMemo(() => {
    const map = new Map<string, Challenge>();
    for (const ch of sampleChallenges) {
      map.set(ch.clipId, ch);
    }
    return map;
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PREFERRED_DIFFICULTIES_KEY),
      AsyncStorage.getItem(PREFERRED_TOPICS_KEY),
    ]).then(([dRaw, tRaw]) => {
      if (dRaw) setPrefDifficulties(JSON.parse(dRaw));
      if (tRaw) setPrefTopics(JSON.parse(tRaw));
      setPrefsLoaded(true);
    });
  }, []);

  const filteredClips = useMemo(() => {
    if (!prefsLoaded || clips.length === 0) return clips;
    switch (activeCategory) {
      case "For You":
        return recommendClips({
          allClips: clips,
          likedClipIds: new Set(),
          viewedClipIds: new Set(),
          preferredDifficulties: prefDifficulties,
          preferredTopics: prefTopics,
        });
      case "MadLeets": {
        const challengeClipIds = new Set(
          sampleChallenges.map((ch) => ch.clipId),
        );
        return clips.filter((c) => challengeClipIds.has(c.id));
      }
      case "NeetCode 150":
        return clips.filter((c) => c.creator === "NeetCode");
      case "Trending":
        return [...clips].sort((a, b) => b.likes - a.likes);
      case "New":
        return [...clips].reverse();
      default:
        return clips;
    }
  }, [clips, prefsLoaded, prefDifficulties, prefTopics, activeCategory]);

  const handleCategoryChange = useCallback((cat: Category) => {
    setActiveCategory(cat);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />
      {loading || !prefsLoaded ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.colors.textSecondary} size="large" />
        </View>
      ) : (
        <>
          <VideoFeed
            clips={filteredClips}
            challengeMap={challengeMap}
            challengesEnabled={madLeetsEnabled}
          />
          <CategoryBar
            active={activeCategory}
            onCategoryChange={handleCategoryChange}
          />
        </>
      )}
    </View>
  );
}
