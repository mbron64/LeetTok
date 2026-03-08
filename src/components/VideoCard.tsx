import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Clip } from "../types";
import { formatCount } from "../lib/format";
import { useLike, useBookmark } from "../lib/hooks";

const DIFFICULTY_COLORS: Record<Clip["difficulty"], string> = {
  Easy: "#22c55e",
  Medium: "#eab308",
  Hard: "#ef4444",
};

type Props = {
  clip: Clip;
  isActive: boolean;
  height: number;
};

export default function VideoCard({ clip, isActive, height }: Props) {
  const { width } = useWindowDimensions();
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;

  const { liked, count: likeOffset, toggle: toggleLike } = useLike(clip.id);
  const {
    bookmarked,
    count: bookmarkOffset,
    toggle: toggleBookmark,
  } = useBookmark(clip.id);

  const player = useVideoPlayer(clip.videoUrl, (p) => {
    p.loop = true;
    p.muted = false;
    p.timeUpdateEventInterval = 0.25;
  });

  useEffect(() => {
    if (isActive && !isPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isPaused, player]);

  useEffect(() => {
    const sub = player.addListener("timeUpdate", (payload) => {
      const duration = player.duration;
      if (duration > 0) {
        setProgress(payload.currentTime / duration);
      }
    });
    return () => sub.remove();
  }, [player]);

  const flashIcon = useCallback(() => {
    pauseIconOpacity.setValue(1);
    Animated.timing(pauseIconOpacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [pauseIconOpacity]);

  const handleTap = useCallback(() => {
    setIsPaused((prev) => !prev);
    flashIcon();
  }, [flashIcon]);

  return (
    <View style={{ width, height }} className="bg-black">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls={false}
        contentFit="cover"
      />

      <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
        <Animated.View
          style={{ opacity: pauseIconOpacity }}
          className="absolute inset-0 items-center justify-center"
          pointerEvents="none"
        >
          <View className="rounded-full bg-black/40 p-4">
            <Ionicons
              name={isPaused ? "play" : "pause"}
              size={48}
              color="#fff"
            />
          </View>
        </Animated.View>
      </Pressable>

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={styles.gradient}
        pointerEvents="none"
      />

      <View className="absolute bottom-16 left-4 right-16" pointerEvents="none">
        <View className="mb-2 flex-row items-center gap-2">
          <Text className="text-xl font-bold text-white">
            {clip.problemNumber}. {clip.title}
          </Text>
        </View>

        <View className="mb-2 flex-row items-center gap-2">
          <View
            style={{ backgroundColor: DIFFICULTY_COLORS[clip.difficulty] }}
            className="rounded-full px-2.5 py-0.5"
          >
            <Text className="text-xs font-semibold text-white">
              {clip.difficulty}
            </Text>
          </View>
          {clip.topics.map((topic) => (
            <View
              key={topic}
              className="rounded-full bg-white/20 px-2.5 py-0.5"
            >
              <Text className="text-xs text-white">{topic}</Text>
            </View>
          ))}
        </View>

        <Text className="mb-1 text-sm font-medium text-white">
          @{clip.creator}
        </Text>
        <Text className="text-xs text-gray-400">{clip.hook}</Text>
      </View>

      <View className="absolute bottom-28 right-3 items-center gap-5">
        <ActionButton
          icon={liked ? "heart" : "heart-outline"}
          color={liked ? "#ef4444" : "#fff"}
          count={clip.likes + likeOffset}
          onPress={toggleLike}
        />
        <ActionButton
          icon={bookmarked ? "bookmark" : "bookmark-outline"}
          color={bookmarked ? "#eab308" : "#fff"}
          count={clip.bookmarks + bookmarkOffset}
          onPress={toggleBookmark}
        />
        <ActionButton icon="share-social" color="#fff" />
      </View>

      <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
        <View
          style={{ width: `${progress * 100}%` }}
          className="h-full bg-white"
        />
      </View>
    </View>
  );
}

function ActionButton({
  icon,
  color = "#fff",
  count,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color?: string;
  count?: number;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center">
      <Ionicons name={icon} size={28} color={color} />
      {count != null && (
        <Text className="mt-0.5 text-xs text-white">
          {formatCount(count)}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
  },
});
