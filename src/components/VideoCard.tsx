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
import { SAMPLE_PROBLEMS } from "../constants/sampleProblems";
import { trackEvent, trackImpression } from "../lib/track";
import type { ClipContext } from "../lib/tutor";
import MadLeetsOverlay from "./MadLeetsOverlay";
import TutorSheet, { type TutorSheetRef } from "./TutorSheet";
import CodeEditorSheet, { type CodeEditorSheetRef } from "./CodeEditorSheet";

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
  const [tutorSheetOpen, setTutorSheetOpen] = useState(false);
  const [codeEditorSheetOpen, setCodeEditorSheetOpen] = useState(false);
  const challengeTriggered = useRef(false);
  const pauseIconOpacity = useRef(new Animated.Value(0)).current;
  const wasActiveRef = useRef(false);
  const tutorSheetRef = useRef<TutorSheetRef>(null);
  const codeEditorSheetRef = useRef<CodeEditorSheetRef>(null);

  const clipContext: ClipContext = {
    clipId: clip.id,
    problemTitle: clip.title,
    problemNumber: clip.problemNumber,
    difficulty: clip.difficulty,
    topics: clip.topics,
    transcript: "",
    codeSnippets: [],
  };

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
    if (isActive && !isPaused && !tutorSheetOpen && !codeEditorSheetOpen) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isPaused, tutorSheetOpen, codeEditorSheetOpen, player]);

  useEffect(() => {
    if (!isActive && tutorSheetOpen) {
      tutorSheetRef.current?.close();
      setTutorSheetOpen(false);
    }
    if (!isActive && codeEditorSheetOpen) {
      codeEditorSheetRef.current?.close();
      setCodeEditorSheetOpen(false);
    }
  }, [isActive, tutorSheetOpen, codeEditorSheetOpen]);

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
    ).catch(() => {});
  }, [clip.title]);

  const handleTutorOpen = useCallback(() => {
    tutorSheetRef.current?.present();
    setTutorSheetOpen(true);
  }, []);

  const handleTutorClose = useCallback(() => {
    setTutorSheetOpen(false);
  }, []);

  const handleCodeEditorOpen = useCallback(() => {
    if (tutorSheetOpen) {
      tutorSheetRef.current?.close();
      setTutorSheetOpen(false);
    }
    codeEditorSheetRef.current?.open(clip.problemNumber);
    setCodeEditorSheetOpen(true);
    if (user?.id) {
      trackEvent(user.id, clip.id, "code_editor_opened");
    }
  }, [tutorSheetOpen, clip.problemNumber, clip.id, user?.id]);

  const handleCodeEditorClose = useCallback(() => {
    setCodeEditorSheetOpen(false);
  }, []);

  const initials = clip.creator
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const difficultyColor = theme.difficulty[clip.difficulty];

  return (
    <View style={{ width, height, backgroundColor: "#000" }}>
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
      <View style={{ position: "absolute", bottom: 96, left: 12, right: 80 }}>
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
      <View style={{ position: "absolute", bottom: 96, right: 12, alignItems: "center", gap: 16 }}>
        {/* AI Tutor */}
        <Pressable onPress={handleTutorOpen} className="items-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Ionicons name="sparkles" size={24} color="#fbb862" />
          </View>
          <Text className="mt-0.5 text-[11px] text-white">Tutor</Text>
        </Pressable>

        {/* Code Editor - only when clip has a supported problem */}
        {SAMPLE_PROBLEMS.some((p) => p.number === clip.problemNumber) && (
          <Pressable onPress={handleCodeEditorOpen} className="items-center">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-emerald-500/90">
              <Ionicons name="code-slash" size={24} color="#fff" />
            </View>
            <Text className="mt-0.5 text-[11px] text-white">Code</Text>
          </Pressable>
        )}

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
          color={bookmarked ? "#fbb862" : "#fff"}
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
      <View style={{ position: "absolute", bottom: 84, left: 0, right: 0, height: 3, backgroundColor: "rgba(255,255,255,0.2)" }}>
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

      {/* AI Tutor Bottom Sheet */}
      <TutorSheet
        ref={tutorSheetRef}
        clipContext={clipContext}
        onClose={handleTutorClose}
      />

      {/* Code Editor Bottom Sheet */}
      <CodeEditorSheet
        ref={codeEditorSheetRef}
        clipId={clip.id}
        clipContext={clipContext}
        onClose={handleCodeEditorClose}
        onAskTutor={(context) => {
          codeEditorSheetRef.current?.close();
          setCodeEditorSheetOpen(false);
          tutorSheetRef.current?.presentWithContext?.(context);
          setTutorSheetOpen(true);
        }}
      />
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
