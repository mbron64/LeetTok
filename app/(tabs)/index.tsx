import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
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
import type { Challenge, Clip, Difficulty } from "../../src/types";

function staggerClipsByProblem(clips: Clip[]) {
  const buckets = new Map<number, Clip[]>();
  for (const clip of clips) {
    const group = buckets.get(clip.problemNumber);
    if (group) {
      group.push(clip);
    } else {
      buckets.set(clip.problemNumber, [clip]);
    }
  }

  const orderedBuckets = Array.from(buckets.values()).sort((a, b) => b.length - a.length);
  const result: Clip[] = [];
  let previousProblemNumber: number | null = null;

  while (result.length < clips.length) {
    let selectedBucketIndex = -1;

    for (let i = 0; i < orderedBuckets.length; i += 1) {
      const bucket = orderedBuckets[i];
      if (bucket.length === 0) continue;
      if (bucket[0]?.problemNumber === previousProblemNumber) continue;
      selectedBucketIndex = i;
      break;
    }

    if (selectedBucketIndex === -1) {
      selectedBucketIndex = orderedBuckets.findIndex((bucket) => bucket.length > 0);
    }

    if (selectedBucketIndex === -1) break;

    const nextClip = orderedBuckets[selectedBucketIndex].shift();
    if (!nextClip) continue;

    result.push(nextClip);
    previousProblemNumber = nextClip.problemNumber;
    orderedBuckets.sort((a, b) => b.length - a.length);
  }

  return result;
}

export default function FeedScreen() {
  const { clips, loading } = useClips();
  const { enabled: madLeetsEnabled } = useMadLeetsEnabled();
  const isFocused = useIsFocused();
  const [prefDifficulties, setPrefDifficulties] = useState<Difficulty[]>([]);
  const [prefTopics, setPrefTopics] = useState<string[]>([]);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("For You");
  const madLeetsActive = madLeetsEnabled && activeCategory === "MadLeets";

  const challengeMap = useMemo(() => {
    const map = new Map<string, Challenge>();
    const challengeProblemNumbers = new Set(
      sampleChallenges
        .map((challenge) => Number(challenge.problemId))
        .filter((value) => Number.isFinite(value)),
    );
    for (const ch of sampleChallenges) {
      const challengeProblemNumber = Number(ch.problemId);
      if (!Number.isFinite(challengeProblemNumber)) continue;
      for (const clip of clips) {
        if (clip.problemNumber === challengeProblemNumber) {
          map.set(clip.id, ch);
        }
      }
    }
    return map;
  }, [clips]);

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
        const challengeProblemNumbers = new Set(
          sampleChallenges
            .map((ch) => Number(ch.problemId))
            .filter((value) => Number.isFinite(value)),
        );
        const madLeetsClips = clips.filter((c) => challengeProblemNumbers.has(c.problemNumber));
        const staggeredMadLeetsClips = staggerClipsByProblem(madLeetsClips);
        return staggeredMadLeetsClips;
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
  }, [clips.length]);

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
            challengeMap={madLeetsActive ? challengeMap : undefined}
            challengesEnabled={madLeetsActive}
            screenFocused={isFocused}
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
