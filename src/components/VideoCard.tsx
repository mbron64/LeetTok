import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Clip, Challenge } from "../types";
import { formatCount } from "../lib/format";
import { useLike, useBookmark } from "../lib/hooks";
import { useAuth } from "../lib/auth";
import { theme } from "../constants/theme";
import { trackEvent, trackImpression } from "../lib/track";
import MadLeetsOverlay from "./MadLeetsOverlay";

type Props = {
  clip: Clip;
  isActive: boolean;
  height: number;
  challenge?: Challenge;
  challengesEnabled?: boolean;
};

function VideoCard({ clip, isActive, height, challenge, challengesEnabled = true }: Props) {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [isPaused, setIsPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showChallenge, setShowChallenge] = useState(false);
  const challengeTriggered = useRef(false);
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;
  const wasActiveRef = useRef(false);

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

  const lastWatchRef = useRef({ progress: 0, watchedSeconds: 0 });

  useEffect(() => {
    const sub = player.addListener("timeUpdate", (payload) => {
      const duration = player.duration;
      if (duration > 0) {
        const p = payload.currentTime / duration;
        setProgress(p);
        lastWatchRef.current = {
          progress: p,
          watchedSeconds: payload.currentTime,
        };
      }

      if (
        challenge &&
        challengesEnabled &&
        !challengeTriggered.current &&
        payload.currentTime >= challenge.pauseTimestamp
      ) {
        challengeTriggered.current = true;
        player.pause();
        setIsPaused(true);
        setShowChallenge(true);
      }
    });
    return () => sub.remove();
  }, [player, challenge, challengesEnabled]);

  const impressionTrackedRef = useRef(false);
  useEffect(() => {
    if (isActive && user?.id && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true;
      trackImpression(user.id, clip.id);
    }
    if (!isActive) {
      impressionTrackedRef.current = false;
    }
  }, [isActive, user?.id, clip.id]);

  useEffect(() => {
    if (wasActiveRef.current && !isActive && user?.id) {
      const { progress: p, watchedSeconds } = lastWatchRef.current;
      trackEvent(user.id, clip.id, "watch", { progress: p, watchedSeconds });
    }
    wasActiveRef.current = isActive;
  }, [isActive, user?.id, clip.id]);

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

  const dismissChallenge = useCallback(() => {
    setShowChallenge(false);
    setIsPaused(false);
    player.play();
  }, [player]);

  const handleChallengeSubmit = useCallback(
    (_answer: string) => {
      dismissChallenge();
    },
    [dismissChallenge],
  );

  const handleChallengeSkip = useCallback(() => {
    dismissChallenge();
  }, [dismissChallenge]);

  const openLeetCode = useCallback(() => {
    Linking.openURL(
      `https://leetcode.com/problems/${clip.title.toLowerCase().replace(/\s+/g, "-")}/`,
    );
  }, [clip.title]);

  const initials = clip.creator
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const difficultyColor = theme.difficulty[clip.difficulty];

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
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Bottom-left overlay text */}
      <View className="absolute bottom-5 left-3 right-20">
        <Text className="text-[15px] font-bold text-white">
          @{clip.creator}
        </Text>
        <Pressable onPress={() => setExpanded((e) => !e)}>
          <Text
            className="mt-1 text-[13px] leading-[18px] text-white"
            numberOfLines={expanded ? undefined : 2}
          >
            {clip.title}
            {clip.hook ? ` — ${clip.hook}` : ""}
          </Text>
          {!expanded && clip.hook && clip.hook.length > 40 && (
            <Text className="text-[13px] font-semibold text-white/70">
              more
            </Text>
          )}
        </Pressable>
        <View className="mt-1.5 flex-row flex-wrap gap-1.5">
          {clip.topics.map((topic) => (
            <Text key={topic} className="text-[11px] text-white/50">
              #{topic.replace(/\s+/g, "")}
            </Text>
          ))}
        </View>
      </View>

      {/* Right-side action column */}
      <View className="absolute bottom-24 right-3 items-center gap-4">
        {/* Creator avatar */}
        <View className="mb-1 items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-gray-700">
            <Text className="text-sm font-bold text-white">{initials}</Text>
          </View>
          <View className="absolute -bottom-1.5 h-5 w-5 items-center justify-center rounded-full bg-[#ff2d55]">
            <Ionicons name="add" size={14} color="#fff" />
          </View>
        </View>

        <ActionButton
          icon={liked ? "heart" : "heart-outline"}
          color={liked ? "#ef4444" : "#fff"}
          count={clip.likes + likeOffset}
          onPress={toggleLike}
        />
        <ActionButton
          icon="chatbubble-ellipses-outline"
          color="#fff"
          count={clip.comments}
        />
        <ActionButton
          icon={bookmarked ? "bookmark" : "bookmark-outline"}
          color={bookmarked ? "#eab308" : "#fff"}
          count={clip.bookmarks + bookmarkOffset}
          onPress={toggleBookmark}
        />
        <ActionButton icon="arrow-redo" color="#fff" count={clip.shares} />

        {/* LeetCode problem badge */}
        <Pressable onPress={openLeetCode} className="mt-1 items-center">
          <View
            style={{ backgroundColor: difficultyColor }}
            className="h-10 w-10 items-center justify-center rounded-full"
          >
            <Text className="text-xs font-bold text-white">
              {clip.problemNumber}
            </Text>
          </View>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
        <View
          style={{ width: `${progress * 100}%` }}
          className="h-full bg-white"
        />
      </View>

      {/* MadLeets Challenge Overlay */}
      {challenge && (
        <MadLeetsOverlay
          challenge={challenge}
          visible={showChallenge}
          onSubmit={handleChallengeSubmit}
          onSkip={handleChallengeSkip}
          onDismiss={dismissChallenge}
        />
      )}
    </View>
  );
}

const ActionButton = React.memo(function ActionButton({
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
        <Text className="mt-0.5 text-[11px] text-white">
          {formatCount(count)}
        </Text>
      )}
    </Pressable>
  );
});

export default React.memo(VideoCard);

const styles = StyleSheet.create({
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
});
