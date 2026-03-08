import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { Challenge } from "../types";
import { validateAnswer, type ValidationResult } from "../lib/validate-answer";
import CodeInput from "./CodeInput";

type Props = {
  challenge: Challenge;
  visible: boolean;
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  onDismiss: () => void;
};

const MONO_FONT = Platform.select({
  ios: "Courier New" as const,
  default: "monospace" as const,
});

export default function MadLeetsOverlay({
  challenge,
  visible,
  onSubmit,
  onSkip,
  onDismiss,
}: Props) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputBorderColor = useSharedValue("rgba(6,182,212,0.6)");
  const shakeX = useSharedValue(0);
  const xpY = useSharedValue(0);
  const xpOpacity = useSharedValue(0);
  const blankPulse = useSharedValue(0.4);

  useEffect(() => {
    if (visible) {
      setAnswer("");
      setResult(null);
      setShowHint(false);
      setSubmitted(false);
      blankPulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.4, { duration: 800 }),
        ),
        -1,
        true,
      );
      hintTimer.current = setTimeout(() => setShowHint(true), 5000);
    }
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [visible, blankPulse]);

  const blankLineStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(6,182,212,${blankPulse.value})`,
  }));

  const inputAnimStyle = useAnimatedStyle(() => ({
    borderColor: inputBorderColor.value,
    transform: [{ translateX: shakeX.value }],
  }));

  const xpAnimStyle = useAnimatedStyle(() => ({
    opacity: xpOpacity.value,
    transform: [{ translateY: xpY.value }],
  }));

  const triggerCorrectFeedback = useCallback(
    (xp: number) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      inputBorderColor.value = withTiming("#22c55e", { duration: 300 });
      xpOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(0, { duration: 1200 }),
      );
      xpY.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(-60, { duration: 1400, easing: Easing.out(Easing.quad) }),
      );
    },
    [inputBorderColor, xpOpacity, xpY],
  );

  const triggerWrongFeedback = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    inputBorderColor.value = withTiming("#ef4444", { duration: 200 });
    shakeX.value = withSequence(
      withSpring(10, { damping: 2, stiffness: 600 }),
      withSpring(-10, { damping: 2, stiffness: 600 }),
      withSpring(8, { damping: 2, stiffness: 600 }),
      withSpring(-8, { damping: 2, stiffness: 600 }),
      withSpring(0, { damping: 4, stiffness: 400 }),
    );
  }, [inputBorderColor, shakeX]);

  const triggerSkipFeedback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputBorderColor.value = withTiming("rgba(100,100,100,0.5)", {
      duration: 300,
    });
  }, [inputBorderColor]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);

    const validation = validateAnswer(
      answer,
      challenge.blankLineContent,
      challenge.acceptedAnswers,
    );
    setResult(validation);

    const xpEarned = Math.round(challenge.xpValue * validation.xpMultiplier);

    if (
      validation.tier === "perfect" ||
      validation.tier === "correct" ||
      validation.tier === "close"
    ) {
      triggerCorrectFeedback(xpEarned);
      setTimeout(() => onSubmit(answer), 1800);
    } else {
      triggerWrongFeedback();
      setTimeout(() => onSubmit(answer), 2500);
    }
  }, [
    answer,
    challenge,
    submitted,
    onSubmit,
    triggerCorrectFeedback,
    triggerWrongFeedback,
  ]);

  const handleSkip = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    setResult({
      tier: "wrong",
      message: "Skipped",
      xpMultiplier: 0,
    });
    triggerSkipFeedback();
    setTimeout(() => onSkip(), 1800);
  }, [submitted, onSkip, triggerSkipFeedback]);

  if (!visible) return null;

  const indentLevel = Math.max(
    0,
    Math.floor(
      (challenge.codeBlock[challenge.blankLineIndex]?.search(/\S/) ?? 0) / 2,
    ),
  );

  const xpEarned = result
    ? Math.round(challenge.xpValue * result.xpMultiplier)
    : 0;

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
      >
        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(140)}
          exiting={SlideOutDown.duration(250)}
          className="rounded-t-3xl"
          style={{ backgroundColor: "#0f0f1a" }}
        >
          <View className="px-5 pb-10 pt-5">
            {/* Drag handle */}
            <View className="mb-4 items-center">
              <View className="h-1 w-10 rounded-full bg-white/20" />
            </View>

            {/* Header */}
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20">
                  <Ionicons name="code-slash" size={16} color="#06b6d4" />
                </View>
                <Text
                  className="text-lg font-bold"
                  style={{ color: "#e4e4e7" }}
                >
                  MadLeets Challenge
                </Text>
              </View>
              <Pressable onPress={onDismiss} hitSlop={12}>
                <Ionicons name="close" size={22} color="#666" />
              </Pressable>
            </View>

            {/* Difficulty + XP badge */}
            <View className="mb-3 flex-row items-center gap-2">
              <View
                className="rounded-full px-2.5 py-0.5"
                style={{
                  backgroundColor:
                    challenge.difficulty === "Easy"
                      ? "rgba(34,197,94,0.15)"
                      : challenge.difficulty === "Medium"
                        ? "rgba(234,179,8,0.15)"
                        : "rgba(239,68,68,0.15)",
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{
                    color:
                      challenge.difficulty === "Easy"
                        ? "#22c55e"
                        : challenge.difficulty === "Medium"
                          ? "#eab308"
                          : "#ef4444",
                  }}
                >
                  {challenge.difficulty}
                </Text>
              </View>
              <View className="rounded-full bg-cyan-500/15 px-2.5 py-0.5">
                <Text className="text-xs font-semibold" style={{ color: "#06b6d4" }}>
                  +{challenge.xpValue} XP
                </Text>
              </View>
              <Text className="text-xs" style={{ color: "#555" }}>
                {challenge.language}
              </Text>
            </View>

            {/* Code block */}
            <View
              className="mb-4 overflow-hidden rounded-xl"
              style={{ backgroundColor: "#1a1a2e" }}
            >
              {challenge.codeBlock.map((line, idx) => {
                const isBlank = idx === challenge.blankLineIndex;
                return (
                  <Animated.View
                    key={idx}
                    className="flex-row"
                    style={[
                      {
                        paddingVertical: 3,
                        paddingRight: 12,
                        borderLeftWidth: isBlank ? 3 : 0,
                      },
                      isBlank ? blankLineStyle : undefined,
                      isBlank
                        ? { backgroundColor: "rgba(6,182,212,0.06)" }
                        : undefined,
                    ]}
                  >
                    {/* Line number */}
                    <Text
                      style={{
                        fontFamily: MONO_FONT,
                        fontSize: 11,
                        color: "#444",
                        width: 36,
                        textAlign: "right",
                        paddingRight: 10,
                        paddingTop: 1,
                      }}
                    >
                      {idx + 1}
                    </Text>
                    {/* Code content */}
                    {isBlank && !submitted ? (
                      <Text
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: 13,
                          color: "rgba(6,182,212,0.5)",
                          fontStyle: "italic",
                          lineHeight: 20,
                        }}
                      >
                        {"  ".repeat(indentLevel)}??? — fill in this line
                      </Text>
                    ) : isBlank && submitted ? (
                      <Text
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: 13,
                          color:
                            result &&
                            (result.tier === "perfect" ||
                              result.tier === "correct" ||
                              result.tier === "close")
                              ? "#22c55e"
                              : "#ef4444",
                          lineHeight: 20,
                        }}
                      >
                        {result &&
                        (result.tier === "perfect" ||
                          result.tier === "correct" ||
                          result.tier === "close")
                          ? answer || challenge.blankLineContent
                          : challenge.blankLineContent}
                      </Text>
                    ) : (
                      <Text
                        style={{
                          fontFamily: MONO_FONT,
                          fontSize: 13,
                          color: "#c9d1d9",
                          lineHeight: 20,
                        }}
                      >
                        {line}
                      </Text>
                    )}
                  </Animated.View>
                );
              })}
            </View>

            {/* Input area */}
            <Animated.View style={inputAnimStyle} className="mb-3 rounded-lg">
              <CodeInput
                value={answer}
                onChangeText={setAnswer}
                placeholder="Type the missing line..."
                indentLevel={indentLevel}
                editable={!submitted}
                style={[
                  {
                    borderWidth: 0,
                    borderRadius: 8,
                  },
                  submitted && result?.tier === "wrong"
                    ? { opacity: 0.5 }
                    : undefined,
                ]}
              />
            </Animated.View>

            {/* XP float animation */}
            <Animated.View
              style={xpAnimStyle}
              className="absolute right-8 top-16"
              pointerEvents="none"
            >
              <Text className="text-2xl font-black" style={{ color: "#22c55e" }}>
                +{xpEarned} XP
              </Text>
            </Animated.View>

            {/* Result message */}
            {result && (
              <Animated.View
                entering={FadeIn.duration(300)}
                className="mb-3 flex-row items-center gap-2"
              >
                <Ionicons
                  name={
                    result.tier === "perfect" || result.tier === "correct"
                      ? "checkmark-circle"
                      : result.tier === "close"
                        ? "checkmark-circle-outline"
                        : "close-circle"
                  }
                  size={18}
                  color={
                    result.tier === "perfect" ||
                    result.tier === "correct" ||
                    result.tier === "close"
                      ? "#22c55e"
                      : "#ef4444"
                  }
                />
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color:
                      result.tier === "perfect" ||
                      result.tier === "correct" ||
                      result.tier === "close"
                        ? "#22c55e"
                        : "#ef4444",
                  }}
                >
                  {result.message}
                </Text>
                {result.xpMultiplier > 0 && (
                  <Text className="text-xs" style={{ color: "#555" }}>
                    (+{Math.round(challenge.xpValue * result.xpMultiplier)} XP)
                  </Text>
                )}
              </Animated.View>
            )}

            {/* Correct answer reveal for wrong/partial/skip */}
            {result &&
              result.tier !== "perfect" &&
              result.tier !== "correct" &&
              result.tier !== "close" && (
                <Animated.View
                  entering={FadeIn.delay(400).duration(400)}
                  className="mb-3 rounded-lg p-3"
                  style={{ backgroundColor: "rgba(239,68,68,0.08)" }}
                >
                  <Text className="mb-1 text-xs" style={{ color: "#888" }}>
                    Correct answer:
                  </Text>
                  <Text
                    style={{
                      fontFamily: MONO_FONT,
                      fontSize: 13,
                      color: "#22c55e",
                      lineHeight: 20,
                    }}
                  >
                    {challenge.blankLineContent}
                  </Text>
                </Animated.View>
              )}

            {/* Hint */}
            {showHint && !submitted && (
              <Animated.View entering={FadeIn.duration(300)} className="mb-3">
                <Pressable
                  onPress={() => setShowHint(true)}
                  className="flex-row items-center gap-1.5"
                >
                  <Ionicons name="bulb-outline" size={14} color="#eab308" />
                  <Text className="text-xs" style={{ color: "#eab308" }}>
                    {challenge.hint}
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {/* Explanation (shown after submit) */}
            {submitted && challenge.explanation && (
              <Animated.View
                entering={FadeIn.delay(600).duration(400)}
                className="mb-3 rounded-lg p-3"
                style={{ backgroundColor: "rgba(99,102,241,0.08)" }}
              >
                <Text className="text-xs leading-4" style={{ color: "#a0a0a0" }}>
                  {challenge.explanation}
                </Text>
              </Animated.View>
            )}

            {/* Action buttons */}
            {!submitted ? (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleSkip}
                  className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                >
                  <Ionicons name="play-skip-forward" size={16} color="#888" />
                  <Text className="text-sm font-medium" style={{ color: "#888" }}>
                    Skip
                  </Text>
                  <Text className="text-[10px]" style={{ color: "#555" }}>
                    -5 XP
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSubmit}
                  className="flex-[2] items-center justify-center rounded-xl py-3.5"
                  style={{
                    backgroundColor: answer.trim()
                      ? "#06b6d4"
                      : "rgba(6,182,212,0.2)",
                  }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{
                      color: answer.trim()
                        ? "#000"
                        : "rgba(6,182,212,0.5)",
                    }}
                  >
                    Submit
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={onDismiss}
                className="items-center rounded-xl py-3.5"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: "#a0a0a0" }}
                >
                  Continue
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}
