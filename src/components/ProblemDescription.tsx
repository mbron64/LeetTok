import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { Problem } from "../constants/sampleProblems";
import { theme } from "../constants/theme";

type Props = {
  problem: Problem;
};

function formatJsonForDisplay(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

export default function ProblemDescription({ problem }: Props) {
  const sampleCases = problem.testCases.filter((tc) => tc.sample);
  const slug = problem.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const leetCodeUrl = `https://leetcode.com/problems/${slug}/`;

  const difficultyColor = theme.difficulty[problem.difficulty];
  const difficultyBg = theme.difficultyBg[problem.difficulty];

  const description = `Implement the ${problem.functionSignature.name} function. Given ${problem.functionSignature.params.map((p) => p.name).join(", ")}, return the expected result.`;

  return (
    <BottomSheetScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4 pt-2">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-white font-semibold text-lg">
            {problem.number}. {problem.title}
          </Text>
          <View
            style={{ backgroundColor: difficultyBg }}
            className="px-2 py-0.5 rounded"
          >
            <Text style={{ color: difficultyColor }} className="text-xs font-medium">
              {problem.difficulty}
            </Text>
          </View>
        </View>

        <Text className="text-[#afb3b6] text-sm leading-5 mt-2">{description}</Text>

        {problem.topics.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mt-3">
            {problem.topics.map((t) => (
              <View
                key={t}
                className="px-2 py-1 rounded bg-white/10"
              >
                <Text className="text-[#afb3b6] text-xs">{t}</Text>
              </View>
            ))}
          </View>
        )}

        {sampleCases.length > 0 && (
          <View className="mt-4">
            <Text className="text-white font-medium text-sm mb-2">Sample Test Cases</Text>
            {sampleCases.map((tc, idx) => (
              <View
                key={idx}
                className="mb-3 p-3 rounded-lg bg-[#1a1a1a] border border-white/5"
              >
                <Text className="text-[#5c6370] text-xs mb-1">Input:</Text>
                <Text className="text-[#afb3b6] text-xs font-mono break-all">
                  {formatJsonForDisplay(tc.input)}
                </Text>
                <Text className="text-[#5c6370] text-xs mt-2 mb-1">Output:</Text>
                <Text className="text-[#afb3b6] text-xs font-mono">{tc.expected_output}</Text>
              </View>
            ))}
          </View>
        )}

        {problem.constraints.length > 0 && (
          <View className="mt-4">
            <Text className="text-white font-medium text-sm mb-2">Constraints</Text>
            <View className="gap-1">
              {problem.constraints.map((c, idx) => (
                <Text key={idx} className="text-[#afb3b6] text-sm">
                  • {c}
                </Text>
              ))}
            </View>
          </View>
        )}

        <Pressable
          onPress={() => {
            Linking.openURL(leetCodeUrl).catch(() => {});
          }}
          className="mt-6 flex-row items-center gap-2 py-3 px-4 rounded-lg bg-white/10 border border-white/20 active:bg-white/15"
        >
          <Ionicons name="open-outline" size={18} color="#ffffff" />
          <Text className="text-white font-medium">Solve on LeetCode</Text>
        </Pressable>
      </View>
    </BottomSheetScrollView>
  );
}
