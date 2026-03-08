import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import VideoFeed from "../../src/components/VideoFeed";
import CategoryBar, { Category } from "../../src/components/CategoryBar";
import { useClips } from "../../src/lib/hooks";
import { recommendClips } from "../../src/lib/recommend";
import { theme } from "../../src/constants/theme";
import {
  PREFERRED_DIFFICULTIES_KEY,
  PREFERRED_TOPICS_KEY,
} from "../onboarding";
import type { Difficulty } from "../../src/types";

export default function FeedScreen() {
  const { clips, loading } = useClips();
  const [prefDifficulties, setPrefDifficulties] = useState<Difficulty[]>([]);
  const [prefTopics, setPrefTopics] = useState<string[]>([]);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("For You");

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

  const recommended = useMemo(() => {
    if (!prefsLoaded || clips.length === 0) return clips;
    return recommendClips({
      allClips: clips,
      likedClipIds: new Set(),
      viewedClipIds: new Set(),
      preferredDifficulties: prefDifficulties,
      preferredTopics: prefTopics,
    });
  }, [clips, prefsLoaded, prefDifficulties, prefTopics]);

  const handleCategoryChange = useCallback((cat: Category) => {
    setActiveCategory(cat);
  }, []);

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      {loading || !prefsLoaded ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      ) : (
        <>
          <VideoFeed clips={recommended} />
          <CategoryBar
            active={activeCategory}
            onCategoryChange={handleCategoryChange}
          />
        </>
      )}
    </View>
  );
}
