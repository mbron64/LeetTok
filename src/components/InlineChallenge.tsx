import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { Challenge } from "../types";
import { validateAnswer, type ValidationResult } from "../lib/validate-answer";
import { calculateXP } from "../lib/xp";
import { getStreakData, updateStreak } from "../lib/streak";
import { recordAttempt } from "../lib/progress";
import { addToReviewQueue } from "../lib/review-queue";
import { suggestTokens, getLanguageTokens } from "../lib/suggest-tokens";
import CodeInput from "./CodeInput";
import CodeKeyboardBar, { CODE_KEYBOARD_BAR_ID } from "./CodeKeyboardBar";

type Props = {
  challenge: Challenge;
  xpMultiplierBonus?: number;
  onComplete: (correct: boolean, xpEarned: number) => void;
  onSkip: () => void;
};

const MONO_FONT = Platform.select({
  ios: "Courier New" as const,
  default: "monospace" as const,
});

export default function InlineChallenge({
  challenge,
  xpMultiplierBonus = 1,
  onComplete,
  onSkip,
}: Props) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [computedXP, setComputedXP] = useState(0);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const inputRef = useRef<TextInput>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokens = useMemo(() => {
    const suggested = suggestTokens(
      challenge.codeBlock,
      challenge.blankLineIndex,
      challenge.language,
    );
    const defaults = getLanguageTokens(challenge.language);
    const seen = new Set(suggested);
    const merged = [...suggested];
    for (const t of defaults) {
      if (!seen.has(t)) {
        seen.add(t);
        merged.push(t);
      }
    }
    return merged;
  }, [challenge]);

  const handleInsertToken = useCallback(
    (token: string) => {
      const { start, end } = selectionRef.current;
      const before = answer.slice(0, start);
      const after = answer.slice(end);
      const newValue = before + token + after;
      const newCursor = start + token.length;
      setAnswer(newValue);
      selectionRef.current = { start: newCursor, end: newCursor };
      requestAnimationFrame(() => {
        inputRef.current?.setNativeProps({
          selection: { start: newCursor, end: newCursor },
        });
      });
    },
    [answer],
  );

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      selectionRef.current = e.nativeEvent.selection;
    },
    [],
  );

  const inputBorderColor = useSharedValue("rgba(6,182,212,0.6)");
  const shakeX = useSharedValue(0);
  const blankPulse = useSharedValue(0.4);

  useEffect(() => {
    setAnswer("");
    setResult(null);
    setShowHint(false);
    setSubmitted(false);
    setComputedXP(0);
    blankPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 }),
      ),
      -1,
      true,
    );
    hintTimer.current = setTimeout(() => setShowHint(true), 5000);
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [challenge.id, blankPulse]);

  const blankLineStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(6,182,212,${blankPulse.value})`,
  }));

  const inputAnimStyle = useAnimatedStyle(() => ({
    borderColor: inputBorderColor.value,
    transform: [{ translateX: shakeX.value }],
  }));

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    setSubmitted(true);

    const validation = validateAnswer(
      answer,
      challenge.blankLineContent,
      challenge.acceptedAnswers,
    );
    setResult(validation);

    const isCorrect =
      validation.tier === "perfect" ||
      validation.tier === "correct" ||
      validation.tier === "close";

    const streakData = await getStreakData();
    const baseXP = isCorrect
      ? calculateXP(
          challenge.difficulty,
          challenge.xpValue,
          validation.xpMultiplier,
          streakData.currentStreak,
          true,
        )
      : 0;
    const finalXP = Math.round(baseXP * xpMultiplierBonus);
    setComputedXP(finalXP);

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      inputBorderColor.value = withTiming("#22c55e", { duration: 300 });
      updateStreak().catch(() => {});
      recordAttempt(challenge, true, finalXP).catch(() => {});
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      inputBorderColor.value = withTiming("#ef4444", { duration: 200 });
      shakeX.value = withSequence(
        withSpring(10, { damping: 2, stiffness: 600 }),
        withSpring(-10, { damping: 2, stiffness: 600 }),
        withSpring(0, { damping: 4, stiffness: 400 }),
      );
      addToReviewQueue(challenge.id).catch(() => {});
      recordAttempt(challenge, false, 0).catch(() => {});
    }
  }, [answer, challenge, submitted, xpMultiplierBonus, inputBorderColor, shakeX]);

  const handleSkipPress = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    setResult({ tier: "wrong", message: "Skipped", xpMultiplier: 0 });
    setComputedXP(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputBorderColor.value = withTiming("rgba(100,100,100,0.5)", { duration: 300 });
    addToReviewQueue(challenge.id).catch(() => {});
    recordAttempt(challenge, false, 0).catch(() => {});
  }, [submitted, challenge, inputBorderColor]);

  const handleContinue = useCallback(() => {
    if (!result) return;
    const isCorrect =
      result.tier === "perfect" ||
      result.tier === "correct" ||
      result.tier === "close";
    if (result.tier === "wrong" && result.message === "Skipped") {
      onSkip();
    } else {
      onComplete(isCorrect, computedXP);
    }
  }, [result, computedXP, onComplete, onSkip]);

  const indentLevel = Math.max(
    0,
    Math.floor(
      (challenge.codeBlock[challenge.blankLineIndex]?.search(/\S/) ?? 0) / 2,
    ),
  );

  return (
    <View className="rounded-2xl p-4" style={{ backgroundColor: "#0f0f1a" }}>
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
            +{Math.round(challenge.xpValue * xpMultiplierBonus)} XP
          </Text>
        </View>
        <Text className="text-xs" style={{ color: "#555" }}>
          {challenge.language}
        </Text>
      </View>

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
                isBlank ? { backgroundColor: "rgba(6,182,212,0.06)" } : undefined,
              ]}
            >
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

      <Animated.View style={inputAnimStyle} className="mb-3 rounded-lg">
        <CodeInput
          ref={inputRef}
          value={answer}
          onChangeText={setAnswer}
          placeholder="Type the missing line..."
          indentLevel={indentLevel}
          editable={!submitted}
          inputAccessoryViewID={
            Platform.OS === "ios" ? CODE_KEYBOARD_BAR_ID : undefined
          }
          onSelectionChange={handleSelectionChange}
          style={[
            { borderWidth: 0, borderRadius: 8 },
            submitted && result?.tier === "wrong" ? { opacity: 0.5 } : undefined,
          ]}
        />
      </Animated.View>

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
          {computedXP > 0 && (
            <Text className="text-xs" style={{ color: "#555" }}>
              (+{computedXP} XP)
            </Text>
          )}
        </Animated.View>
      )}

      {result &&
        result.tier !== "perfect" &&
        result.tier !== "correct" &&
        result.tier !== "close" &&
        result.message !== "Skipped" && (
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

      {showHint && !submitted && (
        <Animated.View entering={FadeIn.duration(300)} className="mb-3">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="bulb-outline" size={14} color="#eab308" />
            <Text className="text-xs" style={{ color: "#eab308" }}>
              {challenge.hint}
            </Text>
          </View>
        </Animated.View>
      )}

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

      {!submitted ? (
        <View className="flex-row gap-3">
          <Pressable
            onPress={handleSkipPress}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3.5"
            style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
          >
            <Ionicons name="play-skip-forward" size={16} color="#888" />
            <Text className="text-sm font-medium" style={{ color: "#888" }}>
              Skip
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
                color: answer.trim() ? "#000" : "rgba(6,182,212,0.5)",
              }}
            >
              Submit
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={handleContinue}
          className="items-center rounded-xl py-3.5"
          style={{ backgroundColor: "rgba(6,182,212,0.15)" }}
        >
          <Text className="text-sm font-semibold" style={{ color: "#06b6d4" }}>
            Continue
          </Text>
        </Pressable>
      )}

      {!submitted && (
        <CodeKeyboardBar tokens={tokens} onInsertToken={handleInsertToken} />
      )}
    </View>
  );
}
